import { Prisma, type TransactionType } from '@prisma/client'
import type { NextApiRequest, NextApiResponse } from 'next'
import type Stripe from 'stripe'
import { getServerSession } from '@/lib/api/getServerSession'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/db'
import { featureFlags } from '@/lib/featureFlags'
import { createAndStoreCryptoInvoice } from '@/lib/nowpayments-checkout'
import { stripe } from '@/lib/stripe-server'
import { GRACE_PERIOD_END, getSubscription, isInGracePeriod } from '@/utils/subscription'

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

    // Keep this transaction narrow: production runs with connection_limit=1, so
    // Any external API call inside the callback holds the only pool connection
    // And any nested non-tx prisma write deadlocks the pool.
    const { customerId, subscriptionData } = await prisma.$transaction(
      async (tx) => {
        const customerId = await ensureCustomer(session.user, tx)
        const subscriptionData = await getSubscription(session.user.id, tx)
        return { customerId, subscriptionData }
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
        timeout: 15_000,
      },
    )

    const checkoutUrl = await createCheckoutSession({
      customerId,
      email: session.user.email ?? '',
      image: session.user.image ?? '',
      isCryptoPayment,
      isGift,
      isLifetime,
      isRecurring,
      locale: session.user.locale ?? '',
      name: session.user.name ?? '',
      priceId,
      referer: req.headers.referer,
      subscriptionData,
      twitchId: session.user.twitchId ?? '',
      userId: session.user.id,
    })

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
    orderBy: { createdAt: 'desc' }, // Use the most recent subscription
    select: { stripeCustomerId: true },
    where: { userId: user.id },
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

  // Create or find customer if needed (email is optional)
  if (!customerId) {
    if (user.email) {
      const existingCustomers = await stripe.customers.list({
        email: user.email,
        limit: 1,
      })

      if (existingCustomers.data.length > 0) {
        customerId = existingCustomers.data[0].id
      }
    }

    if (!customerId) {
      const newCustomer = await createStripeCustomer(user)
      customerId = newCustomer.id
    }

    if (!subscription?.stripeCustomerId) {
      // Update existing subscriptions with no customer ID
      await tx.subscription.updateMany({
        data: { stripeCustomerId: customerId, updatedAt: new Date() },
        where: { stripeCustomerId: null, userId: user.id },
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
      email: user.email ?? '',
      image: user.image ?? '',
      locale: user.locale ?? '',
      name: user.name ?? '',
      twitchId: user.twitchId ?? '',
      userId: user.id,
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
  } = params

  // If this is a crypto payment, use the NOWPayments hosted invoice flow
  if (isCryptoPayment) {
    return await createCryptoInvoice({
      customerId,
      email,
      image,
      isLifetime,
      isRecurring,
      locale,
      name,
      priceId,
      referer,
      subscriptionData,
      twitchId,
      userId,
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
    allow_promotion_codes: true,
    cancel_url: cancelUrl,
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    metadata: {
      email,
      image,
      isCryptoPayment: 'false',
      isGift: isGift ? 'true' : 'false',
      isNewSubscription: isRecurring && !subscriptionData?.stripeSubscriptionId ? 'true' : 'false',
      isUpgradeToLifetime: isLifetime && subscriptionData?.stripeSubscriptionId ? 'true' : 'false',
      locale,
      name,
      previousSubscriptionId: subscriptionData?.stripeSubscriptionId ?? '',
      twitchId,
      userId,
    },
    mode: isRecurring ? 'subscription' : 'payment',
    subscription_data: isRecurring
      ? {
          ...(trialDays > 0 ? { trial_period_days: trialDays } : {}),
          trial_settings: {
            end_behavior: { missing_payment_method: 'cancel' },
          },
        }
      : undefined,
    success_url: successUrl,
  })

  return session.url ?? ''
}

/**
 * Creates a Stripe invoice (for record-keeping) and a matching NOWPayments
 * hosted invoice, then returns the NOWPayments-hosted checkout URL.
 */
async function createCryptoInvoice(
  params: Omit<CheckoutSessionParams, 'isGift' | 'isCryptoPayment' | 'isPaypalPayment'>,
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
  } = params

  // Cancel any pending crypto invoices if this is an upgrade
  if (subscriptionData?.stripePriceId) {
    try {
      const existingSubscription = await prisma.subscription.findFirst({
        select: { metadata: true },
        where: {
          NOT: { status: 'CANCELED' },
          stripeCustomerId: customerId,
          userId,
        },
      })

      const metadata = (existingSubscription?.metadata as Record<string, unknown>) || {}
      const renewalInvoiceId = metadata.renewalInvoiceId as string

      if (renewalInvoiceId) {
        console.log(`Canceling pending invoice ${renewalInvoiceId} for user ${userId}`)
        try {
          await stripe.invoices.voidInvoice(renewalInvoiceId)
        } catch {
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

  const { getCurrentPeriod } = await import('@/utils/subscription')
  const pricePeriod = getCurrentPeriod(priceId)
  const price = await stripe.prices.retrieve(priceId)

  if (!price.unit_amount) {
    throw new Error('Price has no unit amount')
  }

  const dueDate = new Date()
  dueDate.setDate(dueDate.getDate() + 7)

  const invoiceParams: Stripe.InvoiceCreateParams = {
    collection_method: 'send_invoice',
    customer: customerId,
    due_date: Math.floor(dueDate.getTime() / 1000),
    metadata: {
      email,
      image,
      isCryptoPayment: 'true',
      isNewSubscription: isRecurring && !subscriptionData?.stripeSubscriptionId ? 'true' : 'false',
      isUpgradeToLifetime: isLifetime && subscriptionData?.stripeSubscriptionId ? 'true' : 'false',
      locale,
      name,
      paymentProvider: 'nowpayments',
      previousSubscriptionId: subscriptionData?.stripeSubscriptionId ?? '',
      pricePeriod,
      stripePriceId: priceId,
      twitchId,
      userId,
    },
    payment_settings: {
      payment_method_types: [],
    },
  }

  const stripeInvoice = await stripe.invoices.create(invoiceParams)
  if (!stripeInvoice?.id) {
    throw new Error('Stripe invoice creation failed')
  }

  await stripe.invoiceItems.create({
    customer: customerId,
    invoice: stripeInvoice.id,
    price_data: {
      currency: price.currency,
      product: price.product as string,
      unit_amount: price.unit_amount,
    },
  })

  const finalized = await stripe.invoices.finalizeInvoice(stripeInvoice.id, {
    auto_advance: false,
  })

  const { url, nowPaymentsId } = await createAndStoreCryptoInvoice({
    metadata: { pricePeriod, stripePriceId: priceId },
    orderDescription: `Dotabod ${pricePeriod} subscription`,
    stripeInvoice: finalized,
    userId,
  })

  await stripe.invoices.update(stripeInvoice.id, {
    metadata: {
      ...invoiceParams.metadata,
      nowpayments_invoice_id: nowPaymentsId,
      nowpayments_invoice_url: url,
    },
  })

  return url
}
