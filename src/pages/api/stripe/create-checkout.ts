import { getServerSession } from '@/lib/api/getServerSession'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/db'
import { stripe } from '@/lib/stripe-server'
import { SUBSCRIPTION_TIERS } from '@/utils/subscription'
import type { NextApiRequest, NextApiResponse } from 'next'

interface CheckoutRequestBody {
  priceId: string
  period?: string
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
    const { priceId } = (await req.body) as CheckoutRequestBody
    if (!priceId) {
      return res.status(400).json({ error: 'Price ID is required' })
    }

    // Verify price and determine purchase type
    const price = await stripe.prices.retrieve(priceId)
    const isRecurring = price.type === 'recurring'
    const isLifetime = !isRecurring

    // Handle customer and subscription logic in a transaction
    const checkoutUrl = await prisma.$transaction(async (tx) => {
      const customerId = await ensureCustomer(session.user, tx)
      const subscriptionData = await getCurrentSubscription(session.user.id, tx)
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
      })
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
    email?: string
    name?: string
    image?: string
    locale?: string
    twitchId?: string
  },
  tx: any,
): Promise<string> {
  const subscription = await tx.subscription.findUnique({
    where: { userId: user.id },
    select: { stripeCustomerId: true },
  })

  let customerId = subscription?.stripeCustomerId

  // Verify existing customer
  if (customerId) {
    try {
      await stripe.customers.retrieve(customerId)
    } catch (error) {
      // Reset invalid customer ID
      await tx.subscription.update({
        where: { userId: user.id },
        data: {
          stripeCustomerId: null,
          stripePriceId: null,
          stripeSubscriptionId: null,
          status: 'inactive',
          tier: SUBSCRIPTION_TIERS.FREE,
        },
      })
      customerId = null
    }
  }

  // Create or find customer if needed
  if (!customerId && user.email) {
    const existingCustomers = await stripe.customers.list({
      email: user.email,
      limit: 1,
    })

    customerId = existingCustomers.data[0]?.id || (await createStripeCustomer(user)).id

    await tx.subscription.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        stripeCustomerId: customerId,
        tier: SUBSCRIPTION_TIERS.FREE,
      },
      update: { stripeCustomerId: customerId },
    })
  }

  if (!customerId) {
    throw new Error('Unable to establish customer ID')
  }

  return customerId
}

async function createStripeCustomer(user: {
  id: string
  email?: string
  name?: string
  image?: string
  locale?: string
  twitchId?: string
}) {
  return stripe.customers.create({
    email: user.email,
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

async function getCurrentSubscription(userId: string, tx: any) {
  return tx.subscription.findUnique({
    where: { userId },
    select: {
      stripeCustomerId: true,
      stripeSubscriptionId: true,
      status: true,
      stripePriceId: true,
    },
  })
}

interface CheckoutSessionParams {
  customerId: string
  priceId: string
  isRecurring: boolean
  isLifetime: boolean
  subscriptionData: any
  userId: string
  email: string
  name: string
  image: string
  locale: string
  twitchId: string
  referer?: string
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
  } = params

  const baseUrl = process.env.NEXTAUTH_URL!
  const successUrl = `${baseUrl}/dashboard?paid=true&trial=${isRecurring}`
  const cancelUrl = referer?.includes('/dashboard')
    ? `${baseUrl}/dashboard/billing?paid=false`
    : `${baseUrl}/?paid=false`

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: isRecurring ? 'subscription' : 'payment',
    payment_method_types: ['card'],
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: successUrl,
    cancel_url: cancelUrl,
    subscription_data: isRecurring
      ? {
          trial_period_days: 14,
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
    },
  })

  return session.url!
}
