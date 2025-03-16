import type { Prisma } from '@prisma/client'
import { withErrorHandling } from '../utils/error-handling'
import type Stripe from 'stripe'
import { createLifetimePurchase } from './checkout-events'

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
