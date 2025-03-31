import { type Prisma, SubscriptionStatus, TransactionType } from '@prisma/client'
import { getSubscriptionTier } from '@/utils/subscription'
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
        updatedAt: new Date(),
      },
      update: {
        status: status as SubscriptionStatus,
        tier: getSubscriptionTier(priceId, status),
        stripePriceId: priceId,
        stripeCustomerId: subscription.customer as string,
        transactionType: TransactionType.RECURRING,
        currentPeriodEnd,
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        updatedAt: new Date(),
      },
      select: {
        id: true,
      },
    })
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
