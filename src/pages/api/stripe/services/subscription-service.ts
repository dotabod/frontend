import { type Prisma, SubscriptionStatus, TransactionType } from '@prisma/client'
import { stripe } from '@/lib/stripe-server'
import { getSubscriptionTier } from '@/utils/subscription'
import { withErrorHandling } from '../utils/error-handling'
import type Stripe from 'stripe'

/**
 * Service for managing subscription-related operations
 */
export class SubscriptionService {
  constructor(private tx: Prisma.TransactionClient) {}

  /**
   * Upserts a subscription record in the database
   * @param subscription The Stripe subscription object
   * @param userId The user ID
   * @returns The upserted subscription
   */
  async upsertSubscription(
    subscription: Stripe.Subscription,
    userId: string,
  ): Promise<{ id: string } | null> {
    const status = this.mapStripeStatus(subscription.status)
    if (!status) return null

    const priceId = subscription.items.data[0].price.id
    const currentPeriodEnd = new Date(subscription.current_period_end * 1000)

    return await this.tx.subscription.upsert({
      where: {
        stripeSubscriptionId: subscription.id,
      },
      create: {
        stripeSubscriptionId: subscription.id,
        stripeCustomerId: subscription.customer as string,
        status: status as SubscriptionStatus,
        tier: getSubscriptionTier(priceId, status),
        stripePriceId: priceId,
        userId,
        transactionType: TransactionType.RECURRING,
        currentPeriodEnd,
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
      },
      update: {
        status: status as SubscriptionStatus,
        tier: getSubscriptionTier(priceId, status),
        stripePriceId: priceId,
        stripeCustomerId: subscription.customer as string,
        transactionType: TransactionType.RECURRING,
        currentPeriodEnd,
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
      },
      select: {
        id: true,
      },
    })
  }

  /**
   * Pauses a subscription until after a gift expires
   * @param stripeSubscriptionId The Stripe subscription ID
   * @param giftExpirationDate The date when the gift expires
   * @param metadata Additional metadata to store with the subscription
   * @returns True if the pause was successful, false otherwise
   */
  async pauseForGift(
    stripeSubscriptionId: string,
    giftExpirationDate: Date,
    metadata: Record<string, string | number | boolean | null> = {},
  ): Promise<boolean> {
    return (
      (await withErrorHandling(async () => {
        // Get the current subscription from Stripe
        const stripeSubscription = await stripe.subscriptions.retrieve(stripeSubscriptionId)

        // Calculate the resume date (when billing should restart)
        const resumeAt = Math.floor(giftExpirationDate.getTime() / 1000)

        // Check if the subscription is already paused
        const isPaused = stripeSubscription.pause_collection !== null
        const currentResumeAt = isPaused ? stripeSubscription.pause_collection?.resumes_at : 0

        // Only update if the new resume date is later than the current one
        if (!isPaused || (currentResumeAt && resumeAt > currentResumeAt)) {
          // Update the subscription in Stripe to pause billing until after the gift expires
          await stripe.subscriptions.update(stripeSubscriptionId, {
            pause_collection: {
              behavior: 'keep_as_draft',
              resumes_at: resumeAt,
            },
            metadata: {
              ...stripeSubscription.metadata,
              giftExtendedUntil: giftExpirationDate.toISOString(),
              ...metadata,
            },
          })

          console.log(
            `Paused subscription ${stripeSubscriptionId} until gift expires on ${giftExpirationDate.toISOString()}`,
          )

          // Update the subscription in the database too
          const dbSubscription = await this.tx.subscription.findUnique({
            where: { stripeSubscriptionId },
            select: { id: true, metadata: true },
          })

          if (dbSubscription) {
            await this.tx.subscription.update({
              where: { id: dbSubscription.id },
              data: {
                metadata: {
                  ...((dbSubscription.metadata as Record<string, unknown>) || {}),
                  giftExtendedUntil: giftExpirationDate.toISOString(),
                  ...metadata,
                },
              },
            })
          }

          return true
        }

        if (isPaused && currentResumeAt && resumeAt <= currentResumeAt) {
          console.log(
            `Subscription ${stripeSubscriptionId} already paused until ${new Date(
              currentResumeAt * 1000,
            ).toISOString()}, which is later than the new gift expiration ${giftExpirationDate.toISOString()}`,
          )
          return false
        }

        return false
      }, `pauseForGift(${stripeSubscriptionId})`)) !== null
    )
  }

  /**
   * Checks if a user has a gift subscription that extends beyond a given date
   * @param userId The user ID
   * @param comparisonDate The date to compare against
   * @returns True if the user has a gift extending beyond the date, false otherwise
   */
  async hasGiftExtendingBeyond(userId: string, comparisonDate: Date): Promise<boolean> {
    // Check if the user has any gift subscriptions
    const giftSubscription = await this.tx.subscription.findFirst({
      where: {
        userId,
        isGift: true,
        status: { in: ['ACTIVE', 'TRIALING'] },
      },
      orderBy: { currentPeriodEnd: 'desc' },
      select: { currentPeriodEnd: true },
    })

    // If there is a gift subscription, check if it extends beyond the comparison date
    if (giftSubscription?.currentPeriodEnd && giftSubscription.currentPeriodEnd > comparisonDate) {
      return true
    }

    // No gift subscription found
    return false
  }

  /**
   * Maps a Stripe subscription status to our internal status
   * @param stripeStatus The Stripe subscription status
   * @returns The corresponding internal status or null if not found
   */
  public mapStripeStatus(stripeStatus: Stripe.Subscription.Status): SubscriptionStatus | null {
    const statusMap: Record<Stripe.Subscription.Status, SubscriptionStatus> = {
      active: SubscriptionStatus.ACTIVE,
      canceled: SubscriptionStatus.CANCELED,
      incomplete: SubscriptionStatus.INCOMPLETE,
      incomplete_expired: SubscriptionStatus.INCOMPLETE_EXPIRED,
      past_due: SubscriptionStatus.PAST_DUE,
      paused: SubscriptionStatus.PAUSED,
      trialing: SubscriptionStatus.TRIALING,
      unpaid: SubscriptionStatus.UNPAID,
    }

    return statusMap[stripeStatus] || null
  }
}
