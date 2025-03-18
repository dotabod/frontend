import { getServerSession } from '@/lib/api/getServerSession'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/db'
import { stripe } from '@/lib/stripe-server'
import { GRACE_PERIOD_END, getSubscription, isInGracePeriod } from '@/utils/subscription'
import { Prisma, type TransactionType } from '@prisma/client'
import type { NextApiRequest, NextApiResponse } from 'next'

interface CheckoutRequestBody {
  priceId: string
  period?: string
  isGift?: boolean
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
    const { priceId, isGift } = (await req.body) as CheckoutRequestBody
    if (!priceId) {
      return res.status(400).json({ error: 'Price ID is required' })
    }

    // Verify price and determine purchase type
    const price = await stripe.prices.retrieve(priceId)
    const isRecurring = price.type === 'recurring'
    const isLifetime = !isRecurring

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
        data: { stripeCustomerId: customerId },
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
    tx,
  } = params

  const baseUrl = process.env.NEXTAUTH_URL ?? ''

  // Calculate trial period based on grace period
  const now = new Date()

  // Check if the user has an active gift subscription
  const queryClient = tx || prisma
  const hasActiveGiftSubscription = await queryClient.subscription.findFirst({
    where: {
      userId,
      isGift: true,
      status: { in: ['ACTIVE', 'TRIALING'] },
    },
    select: { id: true, currentPeriodEnd: true },
  })

  // Trial period logic:
  // 1. If creating a gift subscription, never apply trial days
  // 2. If user has an active gift subscription and is self-subscribing, set trial to match gift expiration
  // 3. If we're in the grace period, use days until grace period ends as trial
  // 4. Otherwise use standard 14-day trial for new self-subscriptions
  let trialDays = 0

  if (isGift) {
    // Never apply trial days to gift subscriptions
    trialDays = 0
    console.log(`Creating a gift subscription for user ${userId}. No trial period applied.`)
  } else if (hasActiveGiftSubscription && isRecurring) {
    // For users with active gift subscriptions who are self-subscribing,
    // set trial period to match their gift expiration date
    // This ensures they don't get charged until their gift expires
    if (hasActiveGiftSubscription.currentPeriodEnd) {
      const giftEndTime = hasActiveGiftSubscription.currentPeriodEnd.getTime()
      const nowTime = now.getTime()
      trialDays = Math.ceil((giftEndTime - nowTime) / (1000 * 60 * 60 * 24))

      // Ensure we have at least 1 day of trial if gift is about to expire
      trialDays = Math.max(1, trialDays)

      console.log(
        `User ${userId} has active gift subscription expiring on ${hasActiveGiftSubscription.currentPeriodEnd.toISOString()}. Setting trial period to ${trialDays} days.`,
      )
    }
  } else if (isInGracePeriod()) {
    trialDays = Math.ceil((GRACE_PERIOD_END.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  } else if (isRecurring) {
    // Standard trial for new self-subscriptions
    trialDays = 14
  }

  // Get gift subscription count for the user
  const giftCount = hasActiveGiftSubscription
    ? await queryClient.subscription.count({
        where: {
          userId,
          isGift: true,
          status: { in: ['ACTIVE', 'TRIALING'] },
        },
      })
    : 0

  // Build success URL with all necessary parameters
  const successUrl = `${baseUrl || 'https://dotabod.com'}/dashboard?paid=true&trial=${
    isRecurring && trialDays > 0
  }&trialDays=${trialDays}&hasGifts=${!!hasActiveGiftSubscription}&giftCount=${giftCount}`

  const cancelUrl = referer?.includes('/dashboard')
    ? `${baseUrl || 'https://dotabod.com'}/dashboard/billing?paid=false`
    : `${baseUrl || 'https://dotabod.com'}/?paid=false`

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: isRecurring ? 'subscription' : 'payment',
    payment_method_types: ['card'],
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
      hasActiveGiftSubscription: hasActiveGiftSubscription ? 'true' : 'false',
      isGift: isGift ? 'true' : 'false',
      ...(hasActiveGiftSubscription?.currentPeriodEnd
        ? {
            giftExpirationDate: hasActiveGiftSubscription.currentPeriodEnd.toISOString(),
          }
        : {}),
    },
  })

  return session.url ?? ''
}
