import { type Prisma, SubscriptionStatus, TransactionType } from '@prisma/client'
import { stripe } from '@/lib/stripe-server'
import { getSubscriptionTier } from '@/utils/subscription'
import { withErrorHandling } from '../utils/error-handling'
import type Stripe from 'stripe'

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

          console.log(
            `Updated subscription ${existingSubscription.id} status to ${mapStripeStatus(subscription.status)}`,
          )
        } else {
          // Create a new subscription record
          const newSubscription = await tx.subscription.create({
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

          console.log(
            `Created new subscription record ${newSubscription.id} for Stripe subscription ${subscription.id}`,
          )
        }

        return true
      },
      `handleSubscriptionEvent(${subscription.id})`,
      userId,
    )) !== null
  )
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

        console.log(`Marked subscription ${existingSubscription.id} as canceled`)
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
