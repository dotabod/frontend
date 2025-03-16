import type { Prisma } from '@prisma/client'
import { withErrorHandling } from '../utils/error-handling'
import type Stripe from 'stripe'
import { createLifetimePurchase } from './checkout-events'
import { SubscriptionStatus } from '@prisma/client'

/**
 * Handles a charge succeeded event from Stripe
 * @param charge The Stripe charge object
 * @param tx The transaction client
 * @returns True if the operation was successful, false otherwise
 */
export async function handleChargeSucceeded(
  charge: Stripe.Charge,
  tx: Prisma.TransactionClient,
): Promise<boolean> {
  const userId = charge.metadata?.userId
  if (!userId) return false

  return (
    (await withErrorHandling(
      async () => {
        await createLifetimePurchase(
          userId,
          charge.customer as string,
          charge.amount > 0 ? charge.amount.toString() : null,
          tx,
        )
        return true
      },
      `handleChargeSucceeded(${charge.id})`,
      userId,
    )) !== null
  )
}

/**
 * Handles a charge refunded event from Stripe
 * @param charge The Stripe charge object with refund information
 * @param tx The transaction client
 * @returns True if the operation was successful, false otherwise
 */
export async function handleChargeRefunded(
  charge: Stripe.Charge,
  tx: Prisma.TransactionClient,
): Promise<boolean> {
  const userId = charge.metadata?.userId
  if (!userId) return false

  return (
    (await withErrorHandling(
      async () => {
        // Find any lifetime purchases associated with this charge
        const purchase = await tx.subscription.findFirst({
          where: {
            userId,
            stripeCustomerId: charge.customer as string,
            transactionType: 'LIFETIME',
          },
        })

        if (purchase) {
          // If fully refunded, mark the purchase as canceled
          if (charge.refunded) {
            await tx.subscription.update({
              where: { id: purchase.id },
              data: {
                status: SubscriptionStatus.CANCELED,
                metadata: {
                  ...((purchase.metadata as Record<string, unknown>) || {}),
                  refundedAt: new Date().toISOString(),
                  refundAmount:
                    charge.amount_refunded > 0 ? charge.amount_refunded.toString() : null,
                  refundId: charge.refunds?.data?.[0]?.id || null,
                },
              },
            })
          }
          // If partially refunded, update the metadata
          else if (charge.amount_refunded > 0) {
            await tx.subscription.update({
              where: { id: purchase.id },
              data: {
                metadata: {
                  ...((purchase.metadata as Record<string, unknown>) || {}),
                  partiallyRefundedAt: new Date().toISOString(),
                  refundAmount: charge.amount_refunded.toString(),
                  refundId: charge.refunds?.data?.[0]?.id || null,
                },
              },
            })
          }
        }

        return true
      },
      `handleChargeRefunded(${charge.id})`,
      userId,
    )) !== null
  )
}
