import prisma from '@/lib/db'
import { createOrder, createSubscription } from '@/lib/paypal'
import { getPriceId, SUBSCRIPTION_TIERS } from '@/utils/subscription'

type Period = 'monthly' | 'annual' | 'lifetime'

// Best-effort Stripe price ID purely as a display hint for the dashboard's
// Period detection. Empty when not configured (e.g. sandbox) — PayPal does not
// Need it; the period drives everything functional.
function displayPriceId(period: Period): string | null {
  return getPriceId(SUBSCRIPTION_TIERS.PRO, period, false) || null
}

function getPlanId(period: 'monthly' | 'annual'): string {
  const env =
    period === 'annual' ? process.env.PAYPAL_PLAN_ID_ANNUAL : process.env.PAYPAL_PLAN_ID_MONTHLY
  if (!env) {
    throw new Error(`PayPal plan ID for ${period} is not configured`)
  }
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
  period: Period
  userId: string
  email?: string
}): Promise<string> {
  const { period, userId, email } = params
  const baseUrl = process.env.NEXTAUTH_URL || 'https://dotabod.com'
  const cancelUrl = `${baseUrl}/dashboard/billing?paid=false`
  const stripePriceId = displayPriceId(period)

  if (period === 'lifetime') {
    const { orderId, approveUrl } = await createOrder({
      amountCents: getLifetimeAmountCents(),
      cancelUrl,
      currency: 'usd',
      description: 'Dotabod Pro lifetime',
      returnUrl: `${baseUrl}/api/paypal/return?type=order`,
      userId,
    })

    await prisma.payPalOrder.create({
      data: {
        amount: getLifetimeAmountCents() / 100,
        currency: 'usd',
        metadata: { priceType: 'lifetime', stripePriceId },
        paypalOrderId: orderId,
        status: 'CREATED',
        userId,
      },
    })

    return approveUrl
  }

  const planId = getPlanId(period)
  const { subscriptionId, approveUrl } = await createSubscription({
    cancelUrl,
    email,
    planId,
    returnUrl: `${baseUrl}/api/paypal/return?type=subscription`,
    userId,
  })

  await prisma.payPalSubscription.create({
    data: {
      metadata: { priceType: period, stripePriceId },
      paypalSubscriptionId: subscriptionId,
      planId,
      status: 'APPROVAL_PENDING',
      userId,
    },
  })

  return approveUrl
}
