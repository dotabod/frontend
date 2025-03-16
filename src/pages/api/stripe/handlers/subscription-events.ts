import type { Prisma } from '@prisma/client'
import { stripe } from '@/lib/stripe-server'
import { withErrorHandling } from '../utils/error-handling'
import { SubscriptionService } from '../services/subscription-service'
import type Stripe from 'stripe'

/**
 * Handles a subscription created or updated event from Stripe
 * @param subscription The Stripe subscription object
 * @param tx The transaction client
 * @returns True if the operation was successful, false otherwise
 */
export async function handleSubscriptionEvent(
  subscription: Stripe.Subscription,
  tx: Prisma.TransactionClient,
): Promise<boolean> {
  return (
    (await withErrorHandling(
      async () => {
        const customer = await stripe.customers.retrieve(subscription.customer as string)
        const userId = (customer as Stripe.Customer).metadata?.userId
        if (!userId) return false

        const subscriptionService = new SubscriptionService(tx)

        // Check if this is a subscription resuming from a paused state due to a gift
        // and needs its billing cycle reset
        if (
          subscription.status === 'active' &&
          subscription.metadata?.shouldResetBillingCycle === 'true' &&
          !subscription.pause_collection
        ) {
          // The subscription has resumed after being paused for a gift
          // Reset the billing cycle to start from now
          await resetBillingCycle(subscription.id)

          // Clear the shouldResetBillingCycle flag
          await stripe.subscriptions.update(subscription.id, {
            metadata: {
              ...subscription.metadata,
              shouldResetBillingCycle: 'false',
              billingCycleResetAt: new Date().toISOString(),
            },
          })

          console.log(
            `Reset billing cycle for subscription ${subscription.id} after gift expiration`,
          )
        }

        // Upsert the subscription record
        const upsertedSubscription = await subscriptionService.upsertSubscription(
          subscription,
          userId,
        )
        if (!upsertedSubscription) return false

        const currentPeriodEnd = new Date(subscription.current_period_end * 1000)

        // Check if the user has a gift subscription that extends beyond this subscription
        const hasGiftExtendingBeyondSubscription = await subscriptionService.hasGiftExtendingBeyond(
          userId,
          currentPeriodEnd,
        )

        // If the user has a gift subscription that extends beyond this subscription,
        // pause billing until after the gift expires
        if (hasGiftExtendingBeyondSubscription) {
          // Get the latest gift subscription to determine when to resume billing
          const giftSubscription = await tx.subscription.findFirst({
            where: {
              userId,
              isGift: true,
              status: { in: ['ACTIVE', 'TRIALING'] },
            },
            orderBy: { currentPeriodEnd: 'desc' },
            select: { currentPeriodEnd: true },
          })

          if (giftSubscription?.currentPeriodEnd) {
            await subscriptionService.pauseForGift(
              subscription.id,
              giftSubscription.currentPeriodEnd,
              {
                originalRenewalDate: currentPeriodEnd.toISOString(),
              },
            )
          }
        }

        return true
      },
      `handleSubscriptionEvent(${subscription.id})`,
      subscription.customer as string,
    )) !== null
  )
}

/**
 * Resets the billing cycle for a subscription to start from now
 * @param subscriptionId The Stripe subscription ID
 * @returns True if the operation was successful, false otherwise
 */
async function resetBillingCycle(subscriptionId: string): Promise<boolean> {
  try {
    // Get the current subscription
    const subscription = await stripe.subscriptions.retrieve(subscriptionId)

    // Calculate the new billing period end date based on the subscription's billing interval
    const now = Math.floor(Date.now() / 1000)
    let newPeriodEnd = now

    // Get the billing interval from the first price (assuming there's only one)
    const interval = subscription.items.data[0]?.price.recurring?.interval
    const intervalCount = subscription.items.data[0]?.price.recurring?.interval_count || 1

    // Calculate the new period end based on the interval
    if (interval === 'day') {
      newPeriodEnd = now + 86400 * intervalCount // 86400 seconds in a day
    } else if (interval === 'week') {
      newPeriodEnd = now + 604800 * intervalCount // 604800 seconds in a week
    } else if (interval === 'month') {
      // Approximate 30 days for a month
      newPeriodEnd = now + 2592000 * intervalCount // 2592000 seconds in 30 days
    } else if (interval === 'year') {
      // Approximate 365 days for a year
      newPeriodEnd = now + 31536000 * intervalCount // 31536000 seconds in a year
    }

    // Update the subscription with a new billing cycle anchor
    await stripe.subscriptions.update(subscriptionId, {
      billing_cycle_anchor: 'now',
      proration_behavior: 'none',
    })

    console.log(`Reset billing cycle for subscription ${subscriptionId}`)
    return true
  } catch (error) {
    console.error(`Failed to reset billing cycle for subscription ${subscriptionId}:`, error)
    return false
  }
}

/**
 * Handles a subscription deleted event from Stripe
 * @param subscription The Stripe subscription object
 * @param tx The transaction client
 * @returns True if the operation was successful, false otherwise
 */
export async function handleSubscriptionDeleted(
  subscription: Stripe.Subscription,
  tx: Prisma.TransactionClient,
): Promise<boolean> {
  return (
    (await withErrorHandling(
      async () => {
        const customer = await stripe.customers.retrieve(subscription.customer as string)
        const userId = (customer as Stripe.Customer).metadata?.userId
        if (!userId) return false

        // Update the subscription status to canceled
        await tx.subscription.updateMany({
          where: { stripeSubscriptionId: subscription.id },
          data: {
            status: 'CANCELED',
            currentPeriodEnd: new Date(subscription.current_period_end * 1000),
            cancelAtPeriodEnd: true,
          },
        })

        // Check if the user has any other active subscriptions
        const otherActiveSubscriptions = await tx.subscription.findMany({
          where: {
            userId,
            status: { in: ['ACTIVE', 'TRIALING'] },
            stripeSubscriptionId: { not: subscription.id },
          },
        })

        console.log(
          `User ${userId} has ${otherActiveSubscriptions.length} other active subscriptions after cancellation`,
        )

        return true
      },
      `handleSubscriptionDeleted(${subscription.id})`,
      subscription.customer as string,
    )) !== null
  )
}
