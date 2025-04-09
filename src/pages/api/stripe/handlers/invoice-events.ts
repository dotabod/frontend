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
  // Handle crypto payment invoices
  if (invoice.metadata?.isCryptoPayment === 'true') {
    return await handleCryptoInvoiceEvent(invoice, tx)
  }

  // Regular subscription invoices
  if (!invoice.lines.data[0]?.subscription) return false

  return (
    (await withErrorHandling(
      async () => {
        const subscription = await stripe.subscriptions.retrieve(
          invoice.lines.data[0]?.subscription as string,
        )
        const customer = await stripe.customers.retrieve(subscription.customer as string)
        const userId = (customer as Stripe.Customer).metadata?.userId
        if (!userId) return false

        // Map Stripe status to our internal status
        const status = mapStripeStatus(subscription.status)
        const currentPeriodEnd = new Date(subscription.items.data[0]?.current_period_end * 1000)

        // Update the subscription record with the latest status
        await tx.subscription.updateMany({
          where: { stripeSubscriptionId: subscription.id },
          data: {
            status,
            currentPeriodEnd,
            cancelAtPeriodEnd: subscription.cancel_at_period_end,
            updatedAt: new Date(),
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
 * Handles a crypto invoice payment event from Stripe
 * @param invoice The Stripe invoice object
 * @param tx The transaction client
 * @returns True if the operation was successful, false otherwise
 */
async function handleCryptoInvoiceEvent(
  invoice: Stripe.Invoice,
  tx: Prisma.TransactionClient,
): Promise<boolean> {
  const customerId = invoice.customer as string
  const userId = invoice.metadata?.userId

  if (!userId) {
    console.error(`Missing userId in crypto invoice metadata: ${invoice.id}`)
    return false
  }

  return (
    (await withErrorHandling(
      async () => {
        // Find the subscription that references this invoice
        const subscription = await tx.subscription.findFirst({
          where: {
            stripeCustomerId: customerId,
            metadata: {
              path: ['renewalInvoiceId'],
              equals: invoice.id,
            },
          },
        })

        if (!subscription) {
          console.log(`No subscription found with renewalInvoiceId: ${invoice.id}`)
          // If we have an overdue or uncollectible invoice but no subscription with this invoice ID,
          // try to find by customer ID (for current period invoices)
          if (
            invoice.status === 'uncollectible' ||
            invoice.status === 'void' ||
            (invoice.status === 'open' &&
              invoice.due_date &&
              new Date(invoice.due_date * 1000) < new Date())
          ) {
            const activeSubscription = await tx.subscription.findFirst({
              where: {
                stripeCustomerId: customerId,
                userId: userId,
                status: { in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.PAST_DUE] },
              },
            })

            if (activeSubscription) {
              console.log(
                `Found active subscription ${activeSubscription.id} for customer ${customerId}`,
              )
              // Mark as past due or cancelled depending on the situation
              const newStatus =
                invoice.status === 'uncollectible' || invoice.status === 'void'
                  ? SubscriptionStatus.CANCELED
                  : SubscriptionStatus.PAST_DUE

              await tx.subscription.update({
                where: { id: activeSubscription.id },
                data: {
                  status: newStatus,
                  updatedAt: new Date(),
                  metadata: {
                    ...(typeof activeSubscription.metadata === 'object'
                      ? activeSubscription.metadata
                      : {}),
                    lastUnpaidInvoiceId: invoice.id,
                    lastInvoiceStatus: invoice.status,
                  },
                },
              })

              console.log(`Updated subscription ${activeSubscription.id} status to ${newStatus}`)
              return true
            }
          }

          return false
        }

        // Only process paid invoices
        if (invoice.status === 'paid') {
          console.log(
            `Processing paid crypto invoice ${invoice.id} for subscription ${subscription.id}`,
          )

          // Get price ID and period from the subscription
          const priceId = subscription.stripePriceId
          // Extract and use metadata safely
          const metadata = (subscription.metadata as Record<string, unknown>) || {}
          const pricePeriod = (metadata.priceType as string) || 'monthly'

          if (!priceId) {
            console.error(`Missing priceId in subscription: ${subscription.id}`)
            return false
          }

          // Calculate the new period end date
          const isAnnual = pricePeriod === 'annual'

          // Handle the Date properly, considering currentPeriodEnd could be a Date object or string
          let baseDate: Date
          if (subscription.currentPeriodEnd) {
            // Handle if it's already a Date or needs to be converted from string
            baseDate =
              subscription.currentPeriodEnd instanceof Date
                ? subscription.currentPeriodEnd
                : new Date(subscription.currentPeriodEnd)
          } else {
            baseDate = new Date()
          }

          const newPeriodEnd = new Date(baseDate)

          if (isAnnual) {
            newPeriodEnd.setFullYear(newPeriodEnd.getFullYear() + 1)
          } else {
            // Monthly
            newPeriodEnd.setMonth(newPeriodEnd.getMonth() + 1)
          }

          // Create a new draft invoice for the next period
          const renewalDate = new Date(newPeriodEnd)
          // Set the invoice date to 7 days before the period ends
          renewalDate.setDate(renewalDate.getDate() - 7)

          // Calculate the period end date based on the price period
          const periodEnd = new Date()
          if (isAnnual) {
            periodEnd.setFullYear(periodEnd.getFullYear() + 1)
          } else {
            // Monthly
            periodEnd.setMonth(periodEnd.getMonth() + 1)
          }

          try {
            // Create a new draft invoice for the next period
            // Use type assertion to fix customerId type issue
            const params: Stripe.InvoiceCreateParams = {
              customer: customerId,
              collection_method: 'send_invoice',
              description: `Crypto Dotabod Pro ${pricePeriod.charAt(0).toUpperCase() + pricePeriod.slice(1)} subscription`,
              automatically_finalizes_at: Math.floor(renewalDate.getTime() / 1000),
              due_date: Math.floor((renewalDate.getTime() + 7 * 24 * 60 * 60 * 1000) / 1000), // Due date 7 days after finalization date
              auto_advance: true, // Enable automatic advancement so Stripe handles finalization
              metadata: {
                userId,
                isCryptoPayment: 'true',
                isRenewalInvoice: 'true',
                pricePeriod,
                previousInvoiceId: invoice.id || null,
              },
            }

            const newInvoice = await stripe.invoices.create(params)

            // Fetch the price details from Stripe
            const price = await stripe.prices.retrieve(priceId)
            if (!price.unit_amount) {
              throw new Error('Price unit amount is not set')
            }

            // Add the line item for the price
            await stripe.invoiceItems.create({
              customer: customerId,
              amount: price.unit_amount,
              invoice: newInvoice.id,
              description: `Crypto Dotabod Pro ${pricePeriod.charAt(0).toUpperCase() + pricePeriod.slice(1)} subscription`,
            })

            console.log(
              `Created new renewal draft invoice ${newInvoice.id} for next crypto payment period`,
            )

            // Update the subscription with the new period end and invoice ID
            await tx.subscription.update({
              where: { id: subscription.id },
              data: {
                status: SubscriptionStatus.ACTIVE,
                currentPeriodEnd: newPeriodEnd,
                cancelAtPeriodEnd: true, // Will expire at the end of the period
                metadata: {
                  ...(typeof subscription.metadata === 'object' ? subscription.metadata : {}),
                  priceType: pricePeriod,
                  previousRenewalInvoiceId: invoice.id,
                  renewalInvoiceId: newInvoice.id,
                  renewalDueDate: renewalDate.toISOString(),
                },
                updatedAt: new Date(),
              },
            })

            console.log(
              `Updated crypto subscription ${subscription.id} with new period end ${newPeriodEnd.toISOString()} and new invoice ID ${newInvoice.id}`,
            )

            return true
          } catch (error) {
            console.error('Failed to create next crypto renewal invoice:', error)

            // Still update the subscription period
            await tx.subscription.update({
              where: { id: subscription.id },
              data: {
                status: SubscriptionStatus.ACTIVE,
                currentPeriodEnd: newPeriodEnd,
                cancelAtPeriodEnd: true,
                metadata: {
                  ...(typeof subscription.metadata === 'object' ? subscription.metadata : {}),
                  renewalError: 'true',
                },
                updatedAt: new Date(),
              },
            })

            return false
          }
        } else if (invoice.status === 'uncollectible' || invoice.status === 'void') {
          // Mark the subscription as inactive if the invoice is void or uncollectible
          await tx.subscription.update({
            where: { id: subscription.id },
            data: {
              status: SubscriptionStatus.CANCELED,
              updatedAt: new Date(),
              metadata: {
                ...(typeof subscription.metadata === 'object' ? subscription.metadata : {}),
                lastUnpaidInvoiceId: invoice.id,
                cancellationReason: 'invoice_uncollectible',
              },
            },
          })

          console.log(
            `Marked subscription ${subscription.id} as CANCELED due to uncollectible/void invoice`,
          )
          return true
        } else if (
          invoice.status === 'open' &&
          invoice.due_date &&
          new Date(invoice.due_date * 1000) < new Date()
        ) {
          // Invoice is overdue (open but past due date)
          await tx.subscription.update({
            where: { id: subscription.id },
            data: {
              status: SubscriptionStatus.PAST_DUE,
              updatedAt: new Date(),
              metadata: {
                ...(typeof subscription.metadata === 'object' ? subscription.metadata : {}),
                lastOverdueInvoiceId: invoice.id,
              },
            },
          })

          console.log(`Marked subscription ${subscription.id} as PAST_DUE due to overdue invoice`)
          return true
        }

        return true
      },
      `handleCryptoInvoiceEvent(${invoice.id})`,
      customerId,
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
