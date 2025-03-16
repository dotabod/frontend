import type { Prisma } from '@prisma/client'
import { stripe } from '@/lib/stripe-server'
import { withErrorHandling } from '../utils/error-handling'
import { SubscriptionService } from '../services/subscription-service'
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

        const subscriptionService = new SubscriptionService(tx)
        const currentPeriodEnd = new Date(subscription.current_period_end * 1000)

        // Update the subscription record with the latest status
        await tx.subscription.updateMany({
          where: { stripeSubscriptionId: subscription.id },
          data: {
            status: subscriptionService.mapStripeStatus(subscription.status),
            currentPeriodEnd,
            cancelAtPeriodEnd: subscription.cancel_at_period_end,
          },
        })

        // Check if the user has a gift subscription that extends beyond this subscription
        const hasGiftExtendingBeyondSubscription = await subscriptionService.hasGiftExtendingBeyond(
          userId,
          currentPeriodEnd,
        )

        // If this is a payment attempt for a subscription that should be paused due to a gift,
        // void the invoice and ensure the subscription is paused
        if (hasGiftExtendingBeyondSubscription && invoice.status === 'open') {
          // Get the latest gift subscription to determine when to resume billing
          const giftSubscription = await tx.subscription.findFirst({
            where: {
              userId,
              isGift: true,
              status: { in: ['ACTIVE', 'TRIALING'] },
            },
            orderBy: { currentPeriodEnd: 'desc' },
            select: { currentPeriodEnd: true },
          })

          if (giftSubscription?.currentPeriodEnd) {
            // Void the invoice to prevent charging the user
            await stripe.invoices.voidInvoice(invoice.id)
            console.log(
              `Voided invoice ${invoice.id} for user ${userId} with active gift subscription`,
            )

            // Ensure the subscription is paused until after the gift expires
            await subscriptionService.pauseForGift(
              subscription.id,
              giftSubscription.currentPeriodEnd,
              {
                invoiceVoided: 'true',
              },
            )
          }
        }

        return true
      },
      `handleInvoiceEvent(${invoice.id})`,
      invoice.customer as string,
    )) !== null
  )
}
