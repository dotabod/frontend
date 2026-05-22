import prisma from '@/lib/db'
import { createOrder, createSubscription } from '@/lib/paypal'
import { getCurrentPeriod } from '@/utils/subscription'

function getPlanId(period: 'monthly' | 'annual'): string {
  const env =
    period === 'annual' ? process.env.PAYPAL_PLAN_ID_ANNUAL : process.env.PAYPAL_PLAN_ID_MONTHLY
  if (!env) throw new Error(`PayPal plan ID for ${period} is not configured`)
  return env
}

function getLifetimeAmountCents(): number {
  const cents = Number.parseInt(process.env.LIFETIME_SUBSCRIPTION_PRICE_CENTS ?? '', 10)
  if (!Number.isFinite(cents) || cents <= 0) {
    throw new Error('LIFETIME_SUBSCRIPTION_PRICE_CENTS is not configured')
  }
  return cents
}

/**
 * Creates the appropriate PayPal resource for a purchase and returns the URL to
 * redirect the buyer to for approval. Recurring plans use PayPal Subscriptions
 * (PayPal owns billing); lifetime uses a one-time Order. No Stripe involved.
 */
export async function createPaypalApproval(params: {
  priceId: string
  userId: string
  email?: string
}): Promise<string> {
  const { priceId, userId, email } = params
  const period = getCurrentPeriod(priceId)
  const baseUrl = process.env.NEXTAUTH_URL || 'https://dotabod.com'
  const cancelUrl = `${baseUrl}/dashboard/billing?paid=false`

  if (period === 'lifetime') {
    const { orderId, approveUrl } = await createOrder({
      amountCents: getLifetimeAmountCents(),
      currency: 'usd',
      userId,
      returnUrl: `${baseUrl}/api/paypal/return?type=order`,
      cancelUrl,
      description: 'Dotabod Pro lifetime',
    })

    await prisma.payPalOrder.create({
      data: {
        paypalOrderId: orderId,
        userId,
        amount: getLifetimeAmountCents() / 100,
        currency: 'usd',
        status: 'CREATED',
        metadata: { priceType: 'lifetime', stripePriceId: priceId },
      },
    })

    return approveUrl
  }

  const planId = getPlanId(period === 'annual' ? 'annual' : 'monthly')
  const { subscriptionId, approveUrl } = await createSubscription({
    planId,
    userId,
    email,
    returnUrl: `${baseUrl}/api/paypal/return?type=subscription`,
    cancelUrl,
  })

  await prisma.payPalSubscription.create({
    data: {
      paypalSubscriptionId: subscriptionId,
      userId,
      planId,
      status: 'APPROVAL_PENDING',
      metadata: { priceType: period, stripePriceId: priceId },
    },
  })

  return approveUrl
}
