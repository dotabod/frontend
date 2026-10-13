import type Stripe from 'stripe'

interface SubscriptionCanceler {
  cancel: (
    subscriptionId: string,
    params: Stripe.SubscriptionCancelParams,
  ) => Promise<{ id: string }>
}

// A recurring checkout replaces the subscription it was started from, for example a past due
// Monthly plan. Leaving that one alive keeps retrying its failed invoice.
export const cancelReplacedSubscription = async function cancelReplacedSubscription(
  subscriptions: SubscriptionCanceler,
  previousSubscriptionId: string | undefined,
  newSubscriptionId: string,
): Promise<void> {
  if (previousSubscriptionId === undefined || previousSubscriptionId === '') {
    return
  }

  // Crypto subscriptions are database records only, so Stripe has nothing to cancel for them.
  if (
    previousSubscriptionId === newSubscriptionId ||
    previousSubscriptionId.startsWith('crypto_')
  ) {
    return
  }

  try {
    await subscriptions.cancel(previousSubscriptionId, { invoice_now: false, prorate: true })
    console.log(`Canceled replaced Stripe subscription ${previousSubscriptionId}`)
  } catch (error) {
    console.error(`Failed to cancel replaced subscription ${previousSubscriptionId}:`, error)
  }
}
