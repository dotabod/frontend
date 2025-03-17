import { type Prisma, SubscriptionStatus, TransactionType } from '@prisma/client'
import { stripe } from '@/lib/stripe-server'
import { getSubscriptionTier } from '@/utils/subscription'
import { withErrorHandling } from '../utils/error-handling'
import { GiftService } from '../services/gift-service'
import { handleSubscriptionEvent } from './subscription-events'
import { SubscriptionService } from '../services/subscription-service'
import type Stripe from 'stripe'

/**
 * Handles a checkout session completed event from Stripe
 * @param session The Stripe checkout session
 * @param tx The transaction client
 * @returns True if the operation was successful, false otherwise
 */
export async function handleCheckoutCompleted(
  session: Stripe.Checkout.Session,
  tx: Prisma.TransactionClient,
): Promise<boolean> {
  // Handle gift subscriptions
  if (session.metadata?.isGift === 'true') {
    const giftService = new GiftService(tx)
    const result = await giftService.processGiftCheckout(session)

    // After processing a gift checkout, check if we need to update any regular subscriptions
    // This was previously in the webhook handler
    if (result && session.metadata?.recipientUserId) {
      // Find the user's regular subscription and update it based on all gift subscriptions
      const userId = session.metadata.recipientUserId
      const regularSubscription = await tx.subscription.findFirst({
        where: {
          userId,
          status: { in: ['ACTIVE', 'TRIALING'] },
          isGift: false,
          stripeSubscriptionId: { not: null },
        },
      })

      if (regularSubscription?.stripeSubscriptionId) {
        // Find all active gift subscriptions for this user
        const giftSubscriptions = await tx.subscription.findMany({
          where: {
            userId,
            status: { in: ['ACTIVE', 'TRIALING'] },
            isGift: true,
          },
          orderBy: {
            currentPeriodEnd: 'desc',
          },
        })

        // Find the latest gift expiration date
        let latestGiftExpirationDate: Date | null = null
        for (const gift of giftSubscriptions) {
          if (
            gift.currentPeriodEnd &&
            (!latestGiftExpirationDate || gift.currentPeriodEnd > latestGiftExpirationDate)
          ) {
            latestGiftExpirationDate = gift.currentPeriodEnd
          }
        }

        // If we found a valid gift expiration date, update the regular subscription
        if (latestGiftExpirationDate) {
          // Create a subscription service to handle the update
          const subscriptionService = new SubscriptionService(tx)

          // Check if the subscription is already active and not paused
          const stripeSubscription = await stripe.subscriptions.retrieve(
            regularSubscription.stripeSubscriptionId,
          )
          const isPaused = stripeSubscription.pause_collection !== null
          const isActive = stripeSubscription.status === 'active'

          // Get the current period end date from Stripe
          const currentPeriodEnd = new Date(stripeSubscription.current_period_end * 1000)

          // Determine if the gift should be applied after the current paid period
          // Only pause if the gift expiration date is after the current period end
          // or if the subscription is already paused
          if (isPaused || latestGiftExpirationDate > currentPeriodEnd) {
            console.log(
              `Pausing subscription ${regularSubscription.stripeSubscriptionId} until gift expires on ${latestGiftExpirationDate.toISOString()}`,
            )

            // Pause the subscription and ensure the billing cycle will be reset when it resumes
            await subscriptionService.pauseForGift(
              regularSubscription.stripeSubscriptionId,
              latestGiftExpirationDate,
              {
                originalRenewalDate: regularSubscription.currentPeriodEnd?.toISOString() || '',
                giftCheckoutSessionId: session.id,
                shouldResetBillingCycle: 'true',
              },
            )

            console.log(
              `Successfully paused subscription ${regularSubscription.stripeSubscriptionId}`,
            )
          } else {
            // If the gift expiration is before the current period end, we don't need to pause
            // but we should update the metadata to show the gift in the UI timeline
            console.log(
              `Gift expires before current period end. Updating metadata for subscription ${regularSubscription.stripeSubscriptionId}`,
            )

            // Update the subscription metadata to include the gift information
            await stripe.subscriptions.update(regularSubscription.stripeSubscriptionId, {
              metadata: {
                ...stripeSubscription.metadata,
                hasPostPaidGift: 'true',
                giftExpirationDate: latestGiftExpirationDate.toISOString(),
                giftCheckoutSessionId: session.id,
              },
            })

            // Also update the database record
            await tx.subscription.update({
              where: { id: regularSubscription.id },
              data: {
                metadata: {
                  ...((regularSubscription.metadata as Record<string, unknown>) || {}),
                  hasPostPaidGift: 'true',
                  giftExpirationDate: latestGiftExpirationDate.toISOString(),
                  giftCheckoutSessionId: session.id,
                },
              },
            })

            console.log(
              `Updated metadata for subscription ${regularSubscription.stripeSubscriptionId} to include post-paid gift information`,
            )
          }
        }
      }
    }

    return result
  }

  // Handle regular (non-gift) subscriptions
  const userId = session.metadata?.userId
  if (!userId) return false

  return (
    (await withErrorHandling(
      async () => {
        if (session.mode === 'subscription' && session.subscription) {
          const subscription = await stripe.subscriptions.retrieve(session.subscription as string)
          return await handleSubscriptionEvent(subscription, tx)
        }

        if (session.mode === 'payment') {
          const lineItems = await stripe.checkout.sessions.listLineItems(session.id)
          const priceId = lineItems.data[0]?.price?.id ?? null

          if (
            session.metadata?.isUpgradeToLifetime === 'true' &&
            session.metadata?.previousSubscriptionId
          ) {
            try {
              await stripe.subscriptions.cancel(session.metadata.previousSubscriptionId, {
                invoice_now: false,
                prorate: true,
              })
            } catch (error) {
              console.error('Failed to cancel previous subscription:', error)
            }
          }

          await createLifetimePurchase(userId, session.customer as string, priceId, tx)
          return true
        }

        return false
      },
      `handleCheckoutCompleted(${session.id})`,
      session.metadata?.userId,
    )) !== null
  )
}

/**
 * Creates a lifetime purchase subscription
 * @param userId The user ID
 * @param customerId The Stripe customer ID
 * @param priceId The price ID
 * @param tx The transaction client
 * @returns The created subscription
 */
export async function createLifetimePurchase(
  userId: string,
  customerId: string,
  priceId: string | null,
  tx: Prisma.TransactionClient,
): Promise<{ id: string }> {
  return await tx.subscription.create({
    data: {
      userId,
      status: SubscriptionStatus.ACTIVE,
      tier: getSubscriptionTier(priceId, SubscriptionStatus.ACTIVE),
      stripePriceId: priceId || '',
      stripeCustomerId: customerId,
      transactionType: TransactionType.LIFETIME,
      currentPeriodEnd: new Date('2099-12-31'),
      cancelAtPeriodEnd: false,
      stripeSubscriptionId: null,
    },
    select: {
      id: true,
    },
  })
}
