# OpenNode Integration Plan - Complete Implementation Guide

## Overview

Replace BoomFi entirely with OpenNode for BTC/Lightning payments while keeping Stripe as the source of truth for invoices, emails, and business logic. This plan maintains all existing subscription management functionality and fulfillment flows.

## Objectives

- **Replace BoomFi**: Remove all BoomFi code, config, and webhooks
- **Preserve Stripe Integration**: Keep Stripe as authoritative system for invoices and subscriptions
- **Maintain Functionality**: Preserve existing backend flows, renewal system, and subscription lifecycle management
- **OpenNode Integration**: Use OpenNode Hosted Checkout via signed links in Stripe invoices

## Architecture Overview

### Payment Flow

1. **Invoice Creation**: Create Stripe invoices with embedded OpenNode payment links
2. **On-Demand Charges**: Generate OpenNode charges when users click payment links
3. **Webhook Processing**: OpenNode webhooks mark Stripe invoices as paid out-of-band
4. **Fulfillment**: Existing Stripe webhook handlers trigger subscription activation/renewal

### Key Components

- **Paylink Service**: Signed, time-limited links that create charges on-demand
- **OpenNode Integration**: SDK for charge creation and webhook verification
- **Subscription Management**: Preserve existing crypto subscription renewal system
- **Payment Mapping**: Track OpenNode charge IDs to Stripe invoice IDs

## Detailed Implementation

### 1. Paylink Token System

**File**: `src/lib/paylink.ts`

```typescript
import crypto from 'crypto'

export interface PaylinkToken {
  invoiceId: string
  expiresAt: number
}

/**
 * Generates a signed paylink token with expiration
 */
export function generatePaylinkToken(invoiceId: string, ttlMinutes = 60): string {
  const expiresAt = Date.now() + (ttlMinutes * 60 * 1000)
  const payload = `${invoiceId}|${expiresAt}`
  const signature = crypto
    .createHmac('sha256', process.env.PAYLINK_SIGNING_SECRET!)
    .update(payload)
    .digest('base64url')

  return `${signature}.${expiresAt}`
}

/**
 * Verifies and decodes a paylink token
 */
export function verifyPaylinkToken(invoiceId: string, token: string): PaylinkToken | null {
  const [signature, expStr] = (token || '').split('.')

  if (!signature || !expStr) return null

  const expiresAt = Number(expStr)
  if (!expiresAt || Date.now() > expiresAt) return null

  const payload = `${invoiceId}|${expStr}`
  const expectedSignature = crypto
    .createHmac('sha256', process.env.PAYLINK_SIGNING_SECRET!)
    .update(payload)
    .digest('base64url')

  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
    return null
  }

  return { invoiceId, expiresAt }
}

/**
 * Generates a complete paylink URL
 */
export function generatePaylinkUrl(invoiceId: string, ttlMinutes = 60): string {
  const token = generatePaylinkToken(invoiceId, ttlMinutes)
  const baseUrl = process.env.NEXTAUTH_URL || 'https://dotabod.com'
  return `${baseUrl}/api/pay/bitcoin/${invoiceId}?token=${token}`
}
```

### 2. OpenNode SDK Integration

**File**: `src/lib/opennode.ts`

```typescript
import opennode from 'opennode'

// Initialize OpenNode client
opennode.setCredentials(
  process.env.OPENNODE_API_KEY!,
  process.env.NODE_ENV === 'development' ? 'dev' : 'live'
)

export interface OpenNodeChargeParams {
  amount: number
  currency: string
  description: string
  customer_email?: string
  notif_email?: string
  customer_name?: string
  order_id?: string
  callback_url: string
  success_url: string
  auto_settle?: boolean
  ttl?: number
  metadata?: Record<string, any>
}

export interface OpenNodeCharge {
  id: string
  status: string
  amount: number
  currency: string
  hosted_checkout_url: string
  metadata?: Record<string, any>
}

/**
 * Creates an OpenNode charge
 */
export async function createOpenNodeCharge(params: OpenNodeChargeParams): Promise<OpenNodeCharge> {
  try {
    const response = await opennode.createCharge(params)
    return response.data
  } catch (error) {
    console.error('Failed to create OpenNode charge:', error)
    throw error
  }
}

/**
 * Verifies OpenNode webhook signature
 */
export async function verifyOpenNodeWebhook(eventData: any): Promise<boolean> {
  try {
    return await opennode.signatureIsValid(eventData)
  } catch (error) {
    console.error('OpenNode signature verification failed:', error)
    return false
  }
}

/**
 * Constructs hosted checkout URL with options
 */
export function buildCheckoutUrl(chargeId: string, hostedUrl?: string): string {
  const baseUrl = hostedUrl || (
    process.env.NODE_ENV === 'development'
      ? `https://checkout.dev.opennode.com/${chargeId}`
      : `https://checkout.opennode.com/${chargeId}`
  )

  const params: string[] = []
  if (process.env.OPENNODE_CHECKOUT_DEFAULT_LN === 'true') params.push('ln=1')
  if (process.env.OPENNODE_CHECKOUT_HIDE_FIAT === 'true') params.push('hf=1')

  return params.length ? `${baseUrl}?${params.join('&')}` : baseUrl
}
```

### 3. Modified Invoice Creation

**Update**: Replace `createBoomfiInvoice` in `src/pages/api/stripe/create-checkout.ts`

```typescript
import { generatePaylinkUrl } from '@/lib/paylink'

/**
 * Creates an invoice with an OpenNode payment link for crypto payments
 */
async function createOpenNodeInvoice(
  params: Omit<CheckoutSessionParams, 'isGift' | 'isCryptoPayment'>,
): Promise<string> {
  const {
    customerId,
    priceId,
    isRecurring,
    isLifetime,
    subscriptionData,
    userId,
    email,
    name,
    image,
    locale,
    twitchId,
    referer,
    tx,
  } = params

  // Cancel any pending crypto invoices if this is an upgrade
  if (subscriptionData?.stripePriceId && tx) {
    try {
      const existingSubscription = await tx.subscription.findFirst({
        where: {
          userId,
          stripeCustomerId: customerId,
          NOT: { status: 'CANCELED' },
        },
        select: { metadata: true },
      })

      const metadata = (existingSubscription?.metadata as Record<string, unknown>) || {}
      const renewalInvoiceId = metadata.renewalInvoiceId as string

      if (renewalInvoiceId) {
        console.log(`Canceling pending invoice ${renewalInvoiceId} for user ${userId}`)
        try {
          await stripe.invoices.voidInvoice(renewalInvoiceId)
        } catch (invoiceError) {
          try {
            const invoice = await stripe.invoices.retrieve(renewalInvoiceId)
            if (invoice.status === 'open') {
              await stripe.invoices.markUncollectible(renewalInvoiceId)
            }
          } catch (markError) {
            console.error(`Failed to handle invoice ${renewalInvoiceId}:`, markError)
          }
        }
      }
    } catch (error) {
      console.error('Error canceling pending invoices:', error)
    }
  }

  // Get subscription period and price details
  const { getCurrentPeriod } = await import('@/utils/subscription')
  const pricePeriod = getCurrentPeriod(priceId)
  const price = await stripe.prices.retrieve(priceId)

  if (!price.unit_amount) {
    throw new Error('Price has no unit amount')
  }

  // Set due date to 7 days from now
  const dueDate = new Date()
  dueDate.setDate(dueDate.getDate() + 7)

  // Create Stripe invoice
  const invoiceParams: Stripe.InvoiceCreateParams = {
    customer: customerId,
    collection_method: 'send_invoice',
    due_date: Math.floor(dueDate.getTime() / 1000),
    metadata: {
      userId,
      email,
      name,
      image,
      locale,
      twitchId,
      isCryptoPayment: 'true',
      paymentProvider: 'opennode',
      isUpgradeToLifetime: isLifetime && subscriptionData?.stripeSubscriptionId ? 'true' : 'false',
      previousSubscriptionId: subscriptionData?.stripeSubscriptionId ?? '',
      isNewSubscription: isRecurring && !subscriptionData?.stripeSubscriptionId ? 'true' : 'false',
      pricePeriod,
    },
    payment_settings: {
      payment_method_types: [], // Disable Stripe payment methods
    },
  }

  const invoice = await stripe.invoices.create(invoiceParams)

  if (!invoice?.id) {
    throw new Error('Stripe invoice creation failed')
  }

  // Add line item
  await stripe.invoiceItems.create({
    customer: customerId,
    invoice: invoice.id,
    price_data: {
      product: price.product as string,
      unit_amount: price.unit_amount,
      currency: price.currency,
    },
  })

  // Generate signed payment link (1 hour TTL)
  const bitcoinPayLink = generatePaylinkUrl(invoice.id, 60)

  // Update invoice with OpenNode payment link
  await stripe.invoices.update(invoice.id, {
    description: `Pay with Bitcoin: ${bitcoinPayLink}`,
    footer: `Prefer Bitcoin? Click here: ${bitcoinPayLink}`,
    custom_fields: [
      {
        name: 'Bitcoin Payment (OpenNode)',
        value: bitcoinPayLink,
      },
    ],
    metadata: {
      ...invoiceParams.metadata,
      bitcoin_pay_url: bitcoinPayLink,
    },
  })

  // Finalize the invoice
  const finalizedInvoice = await stripe.invoices.finalizeInvoice(invoice.id, {
    auto_advance: false,
  })

  // Return the Stripe hosted invoice URL (not the bitcoin payment URL directly)
  return finalizedInvoice.hosted_invoice_url || `https://invoice.stripe.com/${invoice.id}`
}
```

### 4. OpenNode Payment Route

**File**: `pages/api/pay/bitcoin/[invoiceId]/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe-server'
import { createOpenNodeCharge, buildCheckoutUrl } from '@/lib/opennode'
import { verifyPaylinkToken } from '@/lib/paylink'
import prisma from '@/lib/db'

export async function GET(
  req: NextRequest,
  { params }: { params: { invoiceId: string } }
) {
  try {
    const { invoiceId } = params
    const token = req.nextUrl.searchParams.get('token') || ''

    // Verify token
    const tokenData = verifyPaylinkToken(invoiceId, token)
    if (!tokenData) {
      return new NextResponse('Invalid or expired token', { status: 401 })
    }

    // Fetch and validate Stripe invoice
    const invoice = await stripe.invoices.retrieve(invoiceId)
    if (!invoice || !['draft', 'open'].includes(invoice.status!) || (invoice.amount_remaining || 0) <= 0) {
      return new NextResponse('Invoice not payable', { status: 400 })
    }

    // Check for existing OpenNode charge
    const existingCharge = await prisma.openNodeCharge.findUnique({
      where: { stripeInvoiceId: invoiceId },
    })

    if (existingCharge) {
      // Redirect to existing charge if still valid
      const checkoutUrl = buildCheckoutUrl(existingCharge.openNodeChargeId, existingCharge.hostedCheckoutUrl)
      return NextResponse.redirect(checkoutUrl, { status: 302 })
    }

    // Create new OpenNode charge
    const amount = (invoice.amount_remaining || 0) / 100
    const currency = (invoice.currency || 'usd').toUpperCase()

    const charge = await createOpenNodeCharge({
      amount,
      currency,
      description: `Invoice ${invoice.number || invoice.id}`,
      customer_email: invoice.customer_email || undefined,
      notif_email: invoice.customer_email || undefined,
      callback_url: `${process.env.NEXTAUTH_URL}/api/webhooks/opennode`,
      success_url: `${process.env.NEXTAUTH_URL}/dashboard?paid=true&crypto=true`,
      auto_settle: false, // Configure based on treasury policy
      ttl: 60, // 1 hour expiration
      metadata: {
        stripe_invoice_id: invoice.id,
        customer_id: invoice.customer,
        user_id: invoice.metadata?.userId,
      },
    })

    // Store charge mapping
    await prisma.openNodeCharge.create({
      data: {
        openNodeChargeId: charge.id,
        stripeInvoiceId: invoice.id,
        stripeCustomerId: invoice.customer as string,
        userId: invoice.metadata?.userId || '',
        amount: charge.amount,
        currency: charge.currency,
        status: charge.status,
        hostedCheckoutUrl: charge.hosted_checkout_url,
        metadata: charge.metadata,
      },
    })

    // Redirect to OpenNode checkout
    const checkoutUrl = buildCheckoutUrl(charge.id, charge.hosted_checkout_url)
    return NextResponse.redirect(checkoutUrl, { status: 302 })

  } catch (error) {
    console.error('OpenNode charge creation failed:', error)
    return new NextResponse('Payment processing failed', { status: 500 })
  }
}
```

### 5. OpenNode Webhook Handler

**File**: `pages/api/webhooks/opennode/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe-server'
import { verifyOpenNodeWebhook } from '@/lib/opennode'
import prisma from '@/lib/db'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text()
    let event: any

    try {
      event = JSON.parse(rawBody)
    } catch {
      return new NextResponse('Invalid JSON', { status: 400 })
    }

    // Verify OpenNode signature
    const isValid = await verifyOpenNodeWebhook(event)
    if (!isValid) {
      return new NextResponse('Invalid signature', { status: 400 })
    }

    const charge = event.data || event.charge || {}
    const status: string = charge.status
    const chargeId: string = charge.id
    const invoiceId: string | undefined = charge.metadata?.stripe_invoice_id

    if (!chargeId || !invoiceId) {
      return new NextResponse('OK', { status: 200 })
    }

    console.log(`Processing OpenNode webhook: charge ${chargeId} status ${status}`)

    // Update charge status in database
    await prisma.openNodeCharge.updateMany({
      where: { openNodeChargeId: chargeId },
      data: {
        status,
        lastWebhookAt: new Date(),
      },
    })

    // Handle payment confirmation
    if (status === 'paid' || status === 'confirmed') {
      try {
        // Mark Stripe invoice as paid out-of-band
        await stripe.invoices.pay(
          invoiceId,
          { paid_out_of_band: true },
          { idempotencyKey: chargeId }
        )

        console.log(`Marked Stripe invoice ${invoiceId} as paid via OpenNode charge ${chargeId}`)

        // The existing Stripe webhook handlers will process the invoice.paid event
        // and trigger subscription activation/renewal through the existing flow

      } catch (error) {
        console.error(`Failed to mark invoice ${invoiceId} as paid:`, error)
        // Don't return error - webhook was processed successfully
      }
    }

    return new NextResponse('OK', { status: 200 })

  } catch (error) {
    console.error('OpenNode webhook processing failed:', error)
    return new NextResponse('Webhook processing failed', { status: 500 })
  }
}
```

### 6. Database Schema Addition

**Add to Prisma schema**:

```prisma
model OpenNodeCharge {
  id                  String   @id @default(cuid())
  openNodeChargeId    String   @unique
  stripeInvoiceId     String   @unique
  stripeCustomerId    String
  userId              String
  amount              Float
  currency            String
  status              String
  hostedCheckoutUrl   String?
  metadata            Json?
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt
  lastWebhookAt       DateTime?

  @@map("opennode_charges")
}
```

### 7. Update Webhook Handlers

**Modify**: `src/pages/api/stripe/handlers/invoice-events.ts`

Replace `handleBoomfiInvoicePaid()` calls with OpenNode logic:

```typescript
export async function handleInvoiceEvent(
  invoice: Stripe.Invoice,
  tx: Prisma.TransactionClient,
): Promise<boolean> {
  // Check for OpenNode crypto payment
  if (
    invoice.status === 'paid' &&
    invoice.metadata?.paymentProvider === 'opennode' &&
    invoice.metadata?.isCryptoPayment === 'true'
  ) {
    return await handleOpenNodeInvoicePaid(invoice, tx)
  }

  // Handle regular crypto payment invoices (existing logic)
  if (invoice.metadata?.isCryptoPayment === 'true') {
    return await handleCryptoInvoiceEvent(invoice, tx)
  }

  // Regular subscription invoices (existing logic)
  // ... rest of existing function
}

async function handleOpenNodeInvoicePaid(
  invoice: Stripe.Invoice,
  tx: Prisma.TransactionClient,
): Promise<boolean> {
  const customerId = invoice.customer as string
  const userId = invoice.metadata?.userId

  if (!userId) {
    console.error(`Missing userId in OpenNode invoice metadata: ${invoice.id}`)
    return false
  }

  console.log(`Processing OpenNode invoice.paid event for invoice ${invoice.id} with userId ${userId}`)

  // Use existing BoomFi logic but updated for OpenNode
  // This preserves all the complex subscription management, lifetime handling, etc.
  return await withErrorHandling(async () => {
    // Extract price ID from line items
    if (!invoice.lines?.data || invoice.lines.data.length === 0) {
      console.error(`No line items found in invoice ${invoice.id}`)
      return false
    }

    const lineItem = invoice.lines.data[0]
    let priceId: string | null = null

    if (lineItem.price?.id) {
      priceId = lineItem.price.id
    }

    if (!priceId) {
      console.error(`No price ID found in OpenNode invoice ${invoice.id}`)
      return false
    }

    console.log(`Found price ID ${priceId} in OpenNode invoice ${invoice.id}`)

    // Check if this is a lifetime purchase
    const isLifetime = await isLifetimePrice(priceId)

    if (isLifetime) {
      // Handle lifetime purchase (existing logic from BoomFi)
      console.log(`OpenNode invoice ${invoice.id} is for a lifetime purchase`)

      // Cancel all active subscriptions and create lifetime purchase
      // ... use existing lifetime purchase logic from BoomFi handler

      return true
    } else {
      // Handle recurring subscription (existing logic from BoomFi)
      console.log(`OpenNode invoice ${invoice.id} is for a regular subscription`)

      // Use existing crypto subscription creation/renewal logic
      // ... use existing recurring subscription logic from BoomFi handler

      return true
    }
  }, `handleOpenNodeInvoicePaid(${invoice.id})`, userId || customerId)
}
```

### 8. Environment Variables

**Add to `.env.example`**:

```env
# OpenNode Bitcoin Payment Configuration
OPENNODE_API_KEY=""
PAYLINK_SIGNING_SECRET=""
OPENNODE_CHECKOUT_DEFAULT_LN="true"
OPENNODE_CHECKOUT_HIDE_FIAT="false"
```

**Remove BoomFi variables** (after migration):

```env
# Remove these after OpenNode migration
# BOOMFI_*
```

### 9. Cleanup Tasks

1. **Remove BoomFi Functions**:
   - Delete `createBoomfiInvoice()`
   - Delete `handleBoomfiInvoicePaid()`
   - Remove BoomFi webhook event handling

2. **Update Crypto Payment Detection**:
   - Change from `boomfi_paylink` metadata to `paymentProvider: 'opennode'`
   - Update `isCryptoPayment` flag usage

3. **Environment Cleanup**:
   - Remove BoomFi API keys and webhook endpoints
   - Add OpenNode configuration

4. **Price Metadata**:
   - Remove `boomfi_paylink` from Stripe price metadata
   - No OpenNode-specific metadata needed (uses on-demand charge creation)

## Testing Strategy

### Development Testing

1. **Unit Tests**: Token generation/validation, charge creation, webhook processing
2. **Integration Tests**: End-to-end payment flow with OpenNode dev environment
3. **Webhook Testing**: Use OpenNode webhook simulator

### Staging Testing

1. **Invoice Generation**: Verify signed links are correctly embedded
2. **Payment Flow**: Complete Bitcoin payments through OpenNode checkout
3. **Subscription Activation**: Confirm existing fulfillment flows work
4. **Renewal Testing**: Verify recurring crypto subscription renewals

### Production Rollout

1. **Feature Flag**: Enable OpenNode gradually
2. **Monitoring**: Track payment success rates, webhook processing
3. **Fallback**: Ability to disable Bitcoin payments quickly if needed

## Security Considerations

1. **Token Security**: HMAC signatures prevent link tampering, short TTL limits exposure
2. **Webhook Verification**: OpenNode SDK signature validation prevents spoofing
3. **Idempotency**: Charge IDs prevent duplicate payments
4. **PII Protection**: Minimize logged customer data

## Monitoring & Observability

### Key Metrics

- OpenNode charge creation success rate
- Payment completion rate
- Webhook processing latency
- Token validation failures

### Logging

- Structured logs for charge creation, webhook processing, state transitions
- Error tracking for failed payments, webhook failures
- Alert on high failure rates

## Migration Checklist

- [x] Add OpenNode dependency: `npm install opennode`
- [ ] Create `src/lib/paylink.ts` utility functions
- [ ] Create `src/lib/opennode.ts` SDK integration
- [ ] Add database schema and run migration
- [ ] Implement `pages/api/pay/bitcoin/[invoiceId]/route.ts`
- [ ] Implement `pages/api/webhooks/opennode/route.ts`
- [ ] Replace `createBoomfiInvoice()` with `createOpenNodeInvoice()`
- [ ] Update `handleInvoiceEvent()` to process OpenNode payments
- [ ] Add OpenNode environment variables
- [ ] Test end-to-end payment flow
- [ ] Remove BoomFi code and configuration
- [ ] Deploy and monitor

## Rollback Plan

If issues arise during rollout:

1. **Immediate**: Disable crypto payment option via feature flag
2. **Quick Fix**: Revert to BoomFi code if OpenNode integration fails
3. **Data Recovery**: OpenNode charges are tracked separately, no data loss risk
4. **Customer Impact**: Existing subscriptions unaffected, new payments temporarily disabled

This comprehensive plan maintains all existing functionality while replacing BoomFi with OpenNode, ensuring a smooth transition with minimal risk to the payment and subscription systems.
