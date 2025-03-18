import { type Prisma, SubscriptionStatus, TransactionType } from '@prisma/client'
import { stripe } from '@/lib/stripe-server'
import { withErrorHandling } from '../utils/error-handling'
import { GiftService } from '../services/gift-service'
import { handleSubscriptionEvent } from './subscription-events'
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
 * Creates a lifetime purchase record
 * @param userId The user ID
 * @param customerId The Stripe customer ID
 * @param priceId The Stripe price ID
 * @param tx The transaction client
 * @returns The created subscription
 */
export async function createLifetimePurchase(
  userId: string,
  customerId: string,
  priceId: string | null,
  tx: Prisma.TransactionClient,
): Promise<{ id: string }> {
  // Lifetime subscriptions don't expire for 100 years
  const farFutureDate = new Date()
  farFutureDate.setFullYear(farFutureDate.getFullYear() + 100)

  return await tx.subscription.create({
    data: {
      userId,
      stripeCustomerId: customerId,
      stripePriceId: priceId || undefined,
      status: SubscriptionStatus.ACTIVE,
      tier: 'PRO',
      transactionType: TransactionType.LIFETIME,
      currentPeriodEnd: farFutureDate,
      cancelAtPeriodEnd: false,
    },
    select: {
      id: true,
    },
  })
}
