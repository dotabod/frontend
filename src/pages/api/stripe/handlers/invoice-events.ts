import { type Prisma, SubscriptionStatus } from '@prisma/client'
import { stripe } from '@/lib/stripe-server'
import { withErrorHandling } from '../utils/error-handling'
import type Stripe from 'stripe'

/**
 * Handles an invoice event from Stripe (payment succeeded or failed)
 * @param invoice The Stripe invoice object
 * @param tx The transaction client
 * @returns True if the operation was successful, false otherwise
 */
export async function handleInvoiceEvent(
  invoice: Stripe.Invoice,
  tx: Prisma.TransactionClient,
): Promise<boolean> {
  if (!invoice.subscription) return false

  return (
    (await withErrorHandling(
      async () => {
        const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string)
        const customer = await stripe.customers.retrieve(subscription.customer as string)
        const userId = (customer as Stripe.Customer).metadata?.userId
        if (!userId) return false

        // Map Stripe status to our internal status
        const status = mapStripeStatus(subscription.status)
        const currentPeriodEnd = new Date(subscription.current_period_end * 1000)

        // Update the subscription record with the latest status
        await tx.subscription.updateMany({
          where: { stripeSubscriptionId: subscription.id },
          data: {
            status,
            currentPeriodEnd,
            cancelAtPeriodEnd: subscription.cancel_at_period_end,
          },
        })

        return true
      },
      `handleInvoiceEvent(${invoice.id})`,
      invoice.customer as string,
    )) !== null
  )
}

/**
 * Maps a Stripe subscription status to our internal status
 * @param status The Stripe subscription status
 * @returns The mapped status
 */
function mapStripeStatus(status: string): SubscriptionStatus {
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
      return SubscriptionStatus.PAST_DUE
    case 'incomplete':
      return SubscriptionStatus.PAST_DUE
    case 'incomplete_expired':
      return SubscriptionStatus.CANCELED
    default:
      return SubscriptionStatus.CANCELED
  }
}
