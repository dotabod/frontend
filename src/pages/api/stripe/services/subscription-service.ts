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
            proration_behavior: 'none',
            metadata: {
              ...stripeSubscription.metadata,
              giftExtendedUntil: giftExpirationDate.toISOString(),
              resumeBillingAt: resumeAt.toString(),
              shouldResetBillingCycle: 'true', // Flag for webhook handler
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
                // Also update the currentPeriodEnd to match the gift expiration date
                // This ensures the UI correctly shows when the subscription will renew
                currentPeriodEnd: giftExpirationDate,
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

  /**
   * Adjusts the trial period for a new subscription based on existing gift subscriptions
   * @param subscriptionId The Stripe subscription ID
   * @param userId The user ID
   * @returns True if the adjustment was successful, false otherwise
   */
  async adjustTrialForGifts(subscriptionId: string, userId: string): Promise<boolean> {
    return (
      (await withErrorHandling(async () => {
        // Find all active gift subscriptions for this user
        const giftSubscriptions = await this.tx.subscription.findMany({
          where: {
            userId,
            status: { in: ['ACTIVE', 'TRIALING'] },
            isGift: true,
          },
          orderBy: {
            currentPeriodEnd: 'desc',
          },
          select: {
            id: true,
            currentPeriodEnd: true,
            metadata: true,
          },
        })

        if (giftSubscriptions.length === 0) {
          console.log(`No active gift subscriptions found for user ${userId}`)
          return false
        }

        console.log(
          `Found ${giftSubscriptions.length} active gift subscriptions for user ${userId}`,
        )

        // Find the latest expiration date among gift subscriptions
        let latestExpirationDate: Date | null = null
        for (const gift of giftSubscriptions) {
          if (
            gift.currentPeriodEnd &&
            (!latestExpirationDate || gift.currentPeriodEnd > latestExpirationDate)
          ) {
            latestExpirationDate = new Date(gift.currentPeriodEnd)
          }
        }

        if (!latestExpirationDate) {
          console.log(`No valid expiration dates found in gift subscriptions for user ${userId}`)
          return false
        }

        console.log(
          `Latest gift subscription expiration date: ${latestExpirationDate.toISOString()}`,
        )

        // Get the subscription from Stripe
        const subscription = await stripe.subscriptions.retrieve(subscriptionId)

        // Check if this is a trial subscription
        if (subscription.status !== 'trialing' || !subscription.trial_end) {
          console.log(`Subscription ${subscriptionId} is not in trial period`)
          return false
        }

        // Get the trial end date from the subscription
        const trialEndDate = new Date(subscription.trial_end * 1000)

        // For new subscriptions with gift subscriptions, we want to:
        // 1. Keep the original trial period (don't extend it)
        // 2. Pause the subscription after the trial until the gift expires

        // Calculate the resume date (when billing should restart)
        const resumeAt = Math.floor(latestExpirationDate.getTime() / 1000)

        console.log(`Original trial end: ${trialEndDate.toISOString()}`)
        console.log(`Gift expiration date: ${latestExpirationDate.toISOString()}`)
        console.log(
          `Subscription will resume billing at: ${new Date(resumeAt * 1000).toISOString()}`,
        )

        // Update the subscription to pause after the trial ends
        await stripe.subscriptions.update(subscriptionId, {
          pause_collection: {
            behavior: 'keep_as_draft',
            resumes_at: resumeAt,
          },
          proration_behavior: 'none',
          metadata: {
            ...subscription.metadata,
            adjustedForGift: 'true',
            originalTrialEnd: subscription.trial_end.toString(),
            giftExpirationDate: latestExpirationDate.toISOString(),
            pausedForGift: 'true',
            resumeBillingAt: resumeAt.toString(),
          },
        })

        console.log(
          `Updated subscription ${subscriptionId} to pause after trial until gift expires`,
        )

        // Update the subscription in the database too
        const dbSubscription = await this.tx.subscription.findFirst({
          where: { stripeSubscriptionId: subscriptionId },
          select: { id: true, metadata: true },
        })

        if (dbSubscription) {
          await this.tx.subscription.update({
            where: { id: dbSubscription.id },
            data: {
              metadata: {
                ...((dbSubscription.metadata as Record<string, unknown>) || {}),
                adjustedForGift: 'true',
                giftExpirationDate: latestExpirationDate.toISOString(),
                pausedForGift: 'true',
                resumeBillingAt: resumeAt.toString(),
              },
            },
          })
        }

        return true
      }, `adjustTrialForGifts(${subscriptionId})`)) !== null
    )
  }
}
