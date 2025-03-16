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
