import { SubscriptionStatus } from '@prisma/client'

// The checkout endpoint answers 409 with this code when the user already has a live card plan.
export const LIVE_SUBSCRIPTION_CODE = 'LIVE_SUBSCRIPTION_EXISTS'

// Past due counts as live: Stripe keeps retrying the failed invoice, so a second plan started
// Meanwhile gets billed next to the first as soon as the retry succeeds.
const LIVE_STATUSES: ReadonlySet<SubscriptionStatus> = new Set([
  SubscriptionStatus.ACTIVE,
  SubscriptionStatus.TRIALING,
  SubscriptionStatus.PAST_DUE,
])

interface StoredSubscription {
  status: SubscriptionStatus | null
  stripeSubscriptionId: string | null
}

// Card plans carry a Stripe `sub_` id. Crypto and PayPal plans use other prefixes, while lifetime
// And gift rows have no id, so none of those count as a card subscription that could double bill.
export const isLiveStripeSubscription = function isLiveStripeSubscription(
  subscription: StoredSubscription,
): boolean {
  return (
    subscription.status !== null &&
    LIVE_STATUSES.has(subscription.status) &&
    subscription.stripeSubscriptionId?.startsWith('sub_') === true
  )
}
