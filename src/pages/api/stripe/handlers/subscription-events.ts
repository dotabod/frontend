import { type Prisma, SubscriptionStatus, TransactionType } from '@prisma/client'
import { stripe } from '@/lib/stripe-server'
import { getSubscriptionTier } from '@/utils/subscription'
import { withErrorHandling } from '../utils/error-handling'
import type Stripe from 'stripe'
import { SubscriptionService } from '../services/subscription-service'

/**
 * Handles a subscription event from Stripe
 * @param subscription The Stripe subscription
 * @param tx The transaction client
 * @returns True if the operation was successful, false otherwise
 */
export async function handleSubscriptionEvent(
  subscription: Stripe.Subscription,
  tx: Prisma.TransactionClient,
): Promise<boolean> {
  const customerId = subscription.customer as string
  const customer = await stripe.customers.retrieve(customerId)
  if (customer.deleted) return false

  const userId = (customer as Stripe.Customer).metadata.userId
  if (!userId) return false

  return (
    (await withErrorHandling(
      async () => {
        // Check if this is a new subscription being created
        const isNewSubscription =
          subscription.status === 'trialing' && subscription.metadata?.isNewSubscription === 'true'

        // If this is a new subscription, check for existing gift subscriptions
        if (isNewSubscription) {
          await adjustForExistingGiftSubscriptions(subscription, userId, tx)
        }

        // Check if this is a subscription resuming from a paused state due to a gift
        if (
          subscription.status === 'active' &&
          subscription.metadata?.pausedForGift === 'true' &&
          subscription.pause_collection === null
        ) {
          console.log(`Subscription ${subscription.id} is resuming after gift expiration`)
          // Update the metadata to remove the pausedForGift flag
          await stripe.subscriptions.update(subscription.id, {
            metadata: {
              ...subscription.metadata,
              pausedForGift: 'false',
              resumedAt: new Date().toISOString(),
            },
          })
        }

        // Get the price ID from the subscription
        const priceId = subscription.items.data[0]?.price.id ?? null

        // Find or create the subscription record
        const existingSubscription = await tx.subscription.findFirst({
          where: {
            stripeSubscriptionId: subscription.id,
          },
        })

        if (existingSubscription) {
          // Update the existing subscription
          await tx.subscription.update({
            where: {
              id: existingSubscription.id,
            },
            data: {
              status: mapStripeStatus(subscription.status),
              tier: getSubscriptionTier(priceId, mapStripeStatus(subscription.status)),
              stripePriceId: priceId || '',
              currentPeriodEnd: new Date(subscription.current_period_end * 1000),
              cancelAtPeriodEnd: subscription.cancel_at_period_end,
              metadata: subscription.metadata,
            },
          })
        } else {
          // Create a new subscription record
          await tx.subscription.create({
            data: {
              userId,
              status: mapStripeStatus(subscription.status),
              tier: getSubscriptionTier(priceId, mapStripeStatus(subscription.status)),
              stripePriceId: priceId || '',
              stripeCustomerId: customerId,
              transactionType: TransactionType.RECURRING,
              currentPeriodEnd: new Date(subscription.current_period_end * 1000),
              cancelAtPeriodEnd: subscription.cancel_at_period_end,
              stripeSubscriptionId: subscription.id,
              metadata: subscription.metadata,
            },
          })
        }

        return true
      },
      `handleSubscriptionEvent(${subscription.id})`,
      userId,
    )) !== null
  )
}

/**
 * Adjusts a new subscription for existing gift subscriptions
 * @param subscription The Stripe subscription
 * @param userId The user ID
 * @param tx The transaction client
 */
async function adjustForExistingGiftSubscriptions(
  subscription: Stripe.Subscription,
  userId: string,
  tx: Prisma.TransactionClient,
): Promise<void> {
  // Use the SubscriptionService to adjust the trial period
  const subscriptionService = new SubscriptionService(tx)
  await subscriptionService.adjustTrialForGifts(subscription.id, userId)
}

/**
 * Handles a subscription deleted event from Stripe
 * @param subscription The Stripe subscription
 * @param tx The transaction client
 * @returns True if the operation was successful, false otherwise
 */
export async function handleSubscriptionDeleted(
  subscription: Stripe.Subscription,
  tx: Prisma.TransactionClient,
): Promise<boolean> {
  return (
    (await withErrorHandling(async () => {
      // Find the subscription record
      const existingSubscription = await tx.subscription.findFirst({
        where: {
          stripeSubscriptionId: subscription.id,
        },
      })

      if (existingSubscription) {
        // Update the subscription status to canceled
        await tx.subscription.update({
          where: {
            id: existingSubscription.id,
          },
          data: {
            status: SubscriptionStatus.CANCELED,
            cancelAtPeriodEnd: true,
            metadata: {
              ...((existingSubscription.metadata as Record<string, unknown>) || {}),
              canceledAt: new Date().toISOString(),
            },
          },
        })
      }

      return true
    }, `handleSubscriptionDeleted(${subscription.id})`)) !== null
  )
}

/**
 * Maps a Stripe subscription status to a SubscriptionStatus
 * @param status The Stripe subscription status
 * @returns The corresponding SubscriptionStatus
 */
function mapStripeStatus(status: string): SubscriptionStatus {
  switch (status) {
    case 'active':
      return SubscriptionStatus.ACTIVE
    case 'trialing':
      return SubscriptionStatus.TRIALING
    case 'canceled':
      return SubscriptionStatus.CANCELED
    case 'incomplete':
    case 'incomplete_expired':
    case 'past_due':
    case 'unpaid':
      return SubscriptionStatus.PAST_DUE
    default:
      return SubscriptionStatus.CANCELED
  }
}
