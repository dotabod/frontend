import { getServerSession } from '@/lib/api/getServerSession'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/db'
import { featureFlags } from '@/lib/featureFlags'
import { stripe } from '@/lib/stripe-server'
import { GRACE_PERIOD_END, getSubscription, isInGracePeriod } from '@/utils/subscription'
import { Prisma, type TransactionType } from '@prisma/client'
import type { NextApiRequest, NextApiResponse } from 'next'
import type Stripe from 'stripe'

// Add crypto as a supported payment method type
type ExtendedPaymentMethodType = Stripe.Checkout.SessionCreateParams.PaymentMethodType | 'crypto'

interface CheckoutRequestBody {
  priceId: string
  period?: string
  isGift?: boolean
  paymentMethod?: string
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Authenticate user
    const session = await getServerSession(req, res, authOptions)
    if (!session?.user) {
      return res.status(401).json({ error: 'Unauthorized' })
    }
    if (session.user.isImpersonating) {
      return res.status(403).json({ error: 'Unauthorized: Impersonation not allowed' })
    }

    // Parse and validate request body
    const { priceId, isGift, paymentMethod } = (await req.body) as CheckoutRequestBody
    if (!priceId) {
      return res.status(400).json({ error: 'Price ID is required' })
    }

    // Verify price and determine purchase type
    const price = await stripe.prices.retrieve(priceId)
    const isRecurring = price.type === 'recurring'
    const isLifetime = !isRecurring
    // Check if user wants to pay with crypto and if feature is enabled
    const isCryptoPayment = paymentMethod === 'crypto' && featureFlags.enableCryptoPayments

    // Handle customer and subscription logic in a transaction
    const checkoutUrl = await prisma.$transaction(
      async (tx) => {
        const customerId = await ensureCustomer(session.user, tx)
        const subscriptionData = await getSubscription(session.user.id, tx)
        return await createCheckoutSession({
          customerId,
          priceId,
          isRecurring,
          isLifetime,
          subscriptionData,
          userId: session.user.id,
          email: session.user.email ?? '',
          name: session.user.name ?? '',
          image: session.user.image ?? '',
          locale: session.user.locale ?? '',
          twitchId: session.user.twitchId ?? '',
          referer: req.headers.referer,
          isGift,
          isCryptoPayment,
          tx,
        })
      },
      {
        timeout: 30000, // Increase timeout to 30 seconds to handle gift subscription processing
        isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
      },
    )

    return res.status(200).json({ url: checkoutUrl })
  } catch (error) {
    console.error('Checkout creation failed:', error)
    return res.status(500).json({ error: 'Failed to create checkout session' })
  }
}

async function ensureCustomer(
  user: {
    id: string
    email?: string | null
    name?: string | null
    image?: string | null
    locale?: string | null
    twitchId?: string | null
  },
  tx: Prisma.TransactionClient,
): Promise<string> {
  // Look for any existing subscription to get a customer ID
  const subscription = await tx.subscription.findFirst({
    where: { userId: user.id },
    select: { stripeCustomerId: true },
    orderBy: { createdAt: 'desc' }, // Use the most recent subscription
  })

  let customerId = subscription?.stripeCustomerId

  // Verify existing customer
  if (customerId) {
    try {
      await stripe.customers.retrieve(customerId)
    } catch (error) {
      console.error('Invalid customer ID found:', error)
      customerId = null
    }
  }

  // Create or find customer if needed
  if (!customerId && user.email) {
    const existingCustomers = await stripe.customers.list({
      email: user.email,
      limit: 1,
    })

    if (existingCustomers.data.length > 0) {
      customerId = existingCustomers.data[0].id
    } else {
      const newCustomer = await createStripeCustomer(user)
      customerId = newCustomer.id
    }

    if (!subscription?.stripeCustomerId) {
      // Update existing subscriptions with no customer ID
      await tx.subscription.updateMany({
        where: { userId: user.id, stripeCustomerId: null },
        data: { stripeCustomerId: customerId, updatedAt: new Date() },
      })
    }
  }

  if (!customerId) {
    throw new Error('Unable to establish customer ID')
  }

  return customerId
}

async function createStripeCustomer(user: {
  id: string
  email?: string | null
  name?: string | null
  image?: string | null
  locale?: string | null
  twitchId?: string | null
}) {
  return stripe.customers.create({
    email: user.email ?? undefined,
    metadata: {
      userId: user.id,
      email: user.email ?? '',
      name: user.name ?? '',
      image: user.image ?? '',
      locale: user.locale ?? '',
      twitchId: user.twitchId ?? '',
    },
  })
}

interface CheckoutSessionParams {
  customerId: string
  priceId: string
  isRecurring: boolean
  isLifetime: boolean
  subscriptionData: {
    stripeCustomerId: string | null
    stripeSubscriptionId: string | null
    status: string | null
    stripePriceId: string | null
    transactionType: TransactionType
  } | null
  userId: string
  email: string
  name: string
  image: string
  locale: string
  twitchId: string
  referer?: string
  isGift?: boolean
  isCryptoPayment: boolean
  tx?: Prisma.TransactionClient
}

async function createCheckoutSession(params: CheckoutSessionParams): Promise<string> {
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
    isGift,
    isCryptoPayment,
    tx,
  } = params

  // If this is a crypto payment, use the Boomfi flow with invoices
  if (isCryptoPayment) {
    return await createBoomfiInvoice({
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
    })
  }

  // Handle regular Stripe checkout
  const baseUrl = process.env.NEXTAUTH_URL ?? ''

  // Calculate trial period based on grace period
  const now = new Date()

  // Simplified trial period logic
  let trialDays = 0

  if (isGift) {
    // No trial for gift purchases
    trialDays = 0
  } else if (isInGracePeriod()) {
    // If we're in the grace period, use days until grace period ends as trial
    trialDays = Math.ceil((GRACE_PERIOD_END.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  } else if (isRecurring) {
    // Standard trial for new self-subscriptions
    trialDays = 14
  }

  // Build success URL with simplified parameters
  const successUrl = `${baseUrl || 'https://dotabod.com'}/dashboard?paid=true&crypto=false&trial=${isRecurring && trialDays > 0}&trialDays=${trialDays}`

  const cancelUrl = referer?.includes('/dashboard')
    ? `${baseUrl || 'https://dotabod.com'}/dashboard/billing?paid=false`
    : `${baseUrl || 'https://dotabod.com'}/?paid=false`

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: isRecurring ? 'subscription' : 'payment',
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: successUrl,
    cancel_url: cancelUrl,
    subscription_data: isRecurring
      ? {
          ...(trialDays > 0 ? { trial_period_days: trialDays } : {}),
          trial_settings: {
            end_behavior: { missing_payment_method: 'cancel' },
          },
        }
      : undefined,
    allow_promotion_codes: true,
    metadata: {
      userId,
      email,
      name,
      image,
      locale,
      twitchId,
      isUpgradeToLifetime: isLifetime && subscriptionData?.stripeSubscriptionId ? 'true' : 'false',
      previousSubscriptionId: subscriptionData?.stripeSubscriptionId ?? '',
      isNewSubscription: isRecurring && !subscriptionData?.stripeSubscriptionId ? 'true' : 'false',
      isGift: isGift ? 'true' : 'false',
      isCryptoPayment: 'false',
    },
  })

  return session.url ?? ''
}

/**
 * Creates an invoice with a Boomfi payment link for crypto payments
 */
async function createBoomfiInvoice(
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

  // Cancel any pending crypto invoices if this is an upgrade with crypto payment
  if (subscriptionData?.stripePriceId && tx) {
    try {
      // Get existing subscription metadata to find renewal invoice ID
      const existingSubscription = await tx.subscription.findFirst({
        where: {
          userId,
          stripeCustomerId: customerId,
          NOT: { status: 'CANCELED' },
        },
        select: {
          metadata: true,
        },
      })

      const metadata = (existingSubscription?.metadata as Record<string, unknown>) || {}
      const renewalInvoiceId = metadata.renewalInvoiceId as string

      // If there's a pending invoice, cancel it
      if (renewalInvoiceId) {
        console.log(
          `Canceling pending invoice ${renewalInvoiceId} for user ${userId} due to subscription upgrade`,
        )

        try {
          // Void the invoice to prevent it from being finalized
          await stripe.invoices.voidInvoice(renewalInvoiceId)
          console.log(`Successfully voided invoice ${renewalInvoiceId}`)
        } catch (invoiceError) {
          // If invoice is already finalized, try to mark it as uncollectible instead
          try {
            const invoice = await stripe.invoices.retrieve(renewalInvoiceId)
            if (invoice.status === 'open') {
              await stripe.invoices.markUncollectible(renewalInvoiceId)
              console.log(`Marked invoice ${renewalInvoiceId} as uncollectible`)
            }
          } catch (markError) {
            console.error(`Failed to handle invoice ${renewalInvoiceId}:`, markError)
          }
        }
      }
    } catch (error) {
      console.error('Error canceling pending invoices:', error)
      // Continue with invoice creation even if invoice cancellation fails
      // We'll handle any duplicate payments through customer support
    }
  }

  // Get subscription period type
  const { getCurrentPeriod } = await import('@/utils/subscription')
  const pricePeriod = getCurrentPeriod(priceId)

  // Fetch the price details to get the amount
  const price = await stripe.prices.retrieve(priceId)
  if (!price.unit_amount) {
    throw new Error('Price has no unit amount')
  }

  // Fetch the product to get the Boomfi payment link
  const boomfiPaylink = price.metadata?.boomfi_paylink

  if (!boomfiPaylink) {
    throw new Error('Product does not have a Boomfi payment link configured in metadata')
  }

  // Generate the full Boomfi payment URL with customer identifier
  const boomfiPaymentUrl = `${boomfiPaylink}${boomfiPaylink.includes('?') ? '&' : '?'}customer_ident=${customerId}`

  // Set the due date to be 7 days from now
  const dueDate = new Date()
  dueDate.setDate(dueDate.getDate() + 7)

  // Create a Stripe invoice for the customer with crypto metadata
  const invoiceParams: Stripe.InvoiceCreateParams = {
    customer: customerId,
    collection_method: 'send_invoice', // Critical: use send_invoice instead of charge_automatically
    due_date: Math.floor(dueDate.getTime() / 1000), // Set due date to 7 days from now
    metadata: {
      userId,
      email,
      name,
      image,
      locale,
      twitchId,
      isCryptoPayment: 'true',
      isUpgradeToLifetime: isLifetime && subscriptionData?.stripeSubscriptionId ? 'true' : 'false',
      previousSubscriptionId: subscriptionData?.stripeSubscriptionId ?? '',
      isNewSubscription: isRecurring && !subscriptionData?.stripeSubscriptionId ? 'true' : 'false',
      pricePeriod,
      boomfiPaymentUrl, // Include the Boomfi payment URL in the metadata
    },
    footer:
      'If paying with crypto, upon successful payment, your subscription will be activated automatically.',
    payment_settings: {
      payment_method_types: [], // Empty array disables all payment methods, effectively disabling the hosted payment page link
    },
  }

  // Create the invoice
  const invoice = await stripe.invoices.create(invoiceParams)

  if (!invoice || !invoice.id) {
    console.error('Stripe invoice creation failed or invoice ID is missing.', {
      invoiceDetails: invoice,
    })
    throw new Error('Stripe invoice creation failed or invoice ID is missing.')
  }

  // Add the line item using the price ID directly
  await stripe.invoiceItems.create({
    customer: customerId,
    invoice: invoice.id,
    price_data: {
      product: price.product as string,
      unit_amount: price.unit_amount,
      currency: price.currency,
    },
  })

  // Finalize the invoice so it's ready to be viewed
  const finalizedInvoice = await stripe.invoices.finalizeInvoice(invoice.id, {
    auto_advance: false, // Don't automatically try to charge the customer
  })

  // Return the Boomfi payment URL instead of the hosted invoice URL
  return boomfiPaymentUrl
}
