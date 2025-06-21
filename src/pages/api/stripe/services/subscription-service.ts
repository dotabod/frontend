import { type Prisma, SubscriptionStatus, TransactionType } from '@prisma/client'
import type Stripe from 'stripe'
import { withErrorHandling } from '../utils/error-handling'

/** Service for subscription related operations */
export class SubscriptionService {
  constructor(private tx: Prisma.TransactionClient) {}

  /**
   * Maps Stripe subscription status to internal status
   */
  static mapStripeStatus(status: string): SubscriptionStatus {
    switch (status) {
      case 'active':
        return SubscriptionStatus.ACTIVE
      case 'trialing':
        return SubscriptionStatus.TRIALING
      case 'past_due':
        return SubscriptionStatus.PAST_DUE
      case 'canceled':
        return SubscriptionStatus.CANCELED
      case 'unpaid':
      case 'incomplete':
        return SubscriptionStatus.PAST_DUE
      case 'incomplete_expired':
        return SubscriptionStatus.CANCELED
      default:
        return SubscriptionStatus.CANCELED
    }
  }

  /**
   * Update subscriptions when a charge is refunded
   */
  async processRefund(userId: string, charge: Stripe.Charge): Promise<void> {
    await withErrorHandling(
      async () => {
        const subscriptions = await this.tx.subscription.findMany({
          where: {
            userId,
            stripeCustomerId: charge.customer as string,
          },
        })

        for (const subscription of subscriptions) {
          if (subscription.transactionType === TransactionType.LIFETIME) {
            if (charge.refunded) {
              await this.tx.subscription.update({
                where: { id: subscription.id },
                data: {
                  status: SubscriptionStatus.CANCELED,
                  updatedAt: new Date(),
                  metadata: {
                    ...((subscription.metadata as Record<string, unknown>) || {}),
                    refundedAt: new Date().toISOString(),
                    refundAmount:
                      charge.amount_refunded > 0 ? charge.amount_refunded.toString() : null,
                    refundId: charge.refunds?.data?.[0]?.id || null,
                  },
                },
              })
            } else if (charge.amount_refunded > 0) {
              await this.tx.subscription.update({
                where: { id: subscription.id },
                data: {
                  updatedAt: new Date(),
                  metadata: {
                    ...((subscription.metadata as Record<string, unknown>) || {}),
                    partiallyRefundedAt: new Date().toISOString(),
                    refundAmount: charge.amount_refunded.toString(),
                    refundId: charge.refunds?.data?.[0]?.id || null,
                  },
                },
              })
            }
          } else if (
            (subscription.metadata as Record<string, unknown>)?.isCryptoPayment === 'true' &&
            charge.refunded
          ) {
            await this.tx.subscription.update({
              where: { id: subscription.id },
              data: {
                status: SubscriptionStatus.CANCELED,
                updatedAt: new Date(),
                metadata: {
                  ...((subscription.metadata as Record<string, unknown>) || {}),
                  refundedAt: new Date().toISOString(),
                  refundAmount:
                    charge.amount_refunded > 0 ? charge.amount_refunded.toString() : null,
                  refundId: charge.refunds?.data?.[0]?.id || null,
                  fullyRefunded: 'true',
                },
              },
            })
          } else if (subscription.status !== SubscriptionStatus.CANCELED) {
            await this.tx.subscription.update({
              where: { id: subscription.id },
              data: {
                updatedAt: new Date(),
                metadata: {
                  ...((subscription.metadata as Record<string, unknown>) || {}),
                  refundRecorded: new Date().toISOString(),
                  refundAmount:
                    charge.amount_refunded > 0 ? charge.amount_refunded.toString() : null,
                  refundId: charge.refunds?.data?.[0]?.id || null,
                  fullyRefunded: charge.refunded ? 'true' : 'false',
                },
              },
            })
          }
        }
      },
      `SubscriptionService.processRefund(${charge.id})`,
      userId,
    )
  }
}
