import { type Prisma, SubscriptionStatus } from '@prisma/client'
import type Stripe from 'stripe'
import { stripe } from '@/lib/stripe-server'
import { withErrorHandling } from '../utils/error-handling'
import {
  createCryptoSubscription,
  createLifetimePurchase,
  isLifetimePrice,
} from '../utils/subscription-utils'

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
  // Check for OpenNode crypto payment
  if (
    invoice.status === 'paid' &&
    invoice.metadata?.paymentProvider === 'opennode' &&
    invoice.metadata?.isCryptoPayment === 'true'
  ) {
    return await handleOpenNodeInvoicePaid(invoice, tx)
  }

  // Check for Boomfi crypto payment (legacy - will be removed)
  if (
    invoice.status === 'paid' &&
    invoice.custom_fields?.some((field) => field.name === 'boomfi_invoice_id')
  ) {
    return await handleBoomfiInvoicePaid(invoice, tx)
  }

  // Handle regular crypto payment invoices
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

          // Check if this is a lifetime subscription - lifetime subscriptions should never generate renewal invoices
          if (subscription.transactionType === 'LIFETIME') {
            console.log(
              `Skipping renewal invoice creation for lifetime subscription ${subscription.id}`,
            )
            return true
          }

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
                previousInvoiceId: invoice.id ?? '',
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
                  previousRenewalInvoiceId: invoice.id ?? '',
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

/**
 * Handles an OpenNode crypto invoice.paid event
 * @param invoice The Stripe invoice object with OpenNode metadata
 * @param tx The transaction client
 * @returns True if the operation was successful, false otherwise
 */
async function handleOpenNodeInvoicePaid(
  invoice: Stripe.Invoice,
  tx: Prisma.TransactionClient,
): Promise<boolean> {
  const customerId = invoice.customer as string
  const userId = invoice.metadata?.userId

  if (!userId) {
    console.error(`Missing userId in OpenNode invoice metadata: ${invoice.id}`)
    return false
  }

  console.log(
    `Processing OpenNode invoice.paid event for invoice ${invoice.id} with userId ${userId}`,
  )

  return (
    (await withErrorHandling(
      async () => {
        // First, try to get price ID from invoice metadata (most reliable for crypto payments)
        let priceId: string | null = invoice.metadata?.stripePriceId || null

        // If not in metadata, extract from line items (fallback for regular invoices)
        if (!priceId) {
          if (!invoice.lines?.data || invoice.lines.data.length === 0) {
            console.error(`No line items found in invoice ${invoice.id}`)
            return false
          }

          const lineItem = invoice.lines.data[0]

          // Extract price ID based on the parent type (new Stripe TypeScript types)
          if (
            lineItem.parent &&
            lineItem.pricing &&
            'price_details' in lineItem.pricing &&
            lineItem.pricing.price_details
          ) {
            priceId = lineItem.pricing.price_details.price
          }
        }

        if (!priceId) {
          console.error(`No price ID found in OpenNode invoice ${invoice.id}`)
          return false
        }

        console.log(`Found price ID ${priceId} in OpenNode invoice ${invoice.id}`)

        // Check if this is a lifetime purchase
        const isLifetime = await isLifetimePrice(priceId)

        if (isLifetime) {
          // Handle lifetime purchase - reuse existing BoomFi logic
          console.log(`OpenNode invoice ${invoice.id} is for a lifetime purchase`)

          // Find and cancel all active subscriptions
          const activeSubscriptions = await tx.subscription.findMany({
            where: {
              userId,
              NOT: { status: SubscriptionStatus.CANCELED },
            },
          })

          // Cancel each active subscription and void any pending renewal invoices
          for (const subscription of activeSubscriptions) {
            if (
              subscription.stripeSubscriptionId &&
              !subscription.stripeSubscriptionId.startsWith('crypto_')
            ) {
              try {
                await stripe.subscriptions.cancel(subscription.stripeSubscriptionId, {
                  invoice_now: false,
                  prorate: true,
                })
              } catch (error) {
                console.error(
                  `Failed to cancel Stripe subscription ${subscription.stripeSubscriptionId}:`,
                  error,
                )
              }
            }

            // Void any pending renewal invoices for crypto subscriptions
            if (subscription.metadata) {
              const metadata = (subscription.metadata as Record<string, unknown>) || {}
              const renewalInvoiceId = metadata.renewalInvoiceId as string

              if (renewalInvoiceId) {
                try {
                  console.log(`Voiding renewal invoice ${renewalInvoiceId} due to lifetime upgrade`)
                  await stripe.invoices.voidInvoice(renewalInvoiceId)
                  console.log(`Successfully voided invoice ${renewalInvoiceId}`)
                } catch (invoiceError) {
                  console.error(`Failed to void invoice ${renewalInvoiceId}:`, invoiceError)
                }
              }
            }

            await tx.subscription.update({
              where: { id: subscription.id },
              data: {
                status: SubscriptionStatus.CANCELED,
                cancelAtPeriodEnd: true,
                updatedAt: new Date(),
                metadata: {
                  ...(typeof subscription.metadata === 'object' ? subscription.metadata : {}),
                  upgradedToLifetime: 'true',
                  upgradedAt: new Date().toISOString(),
                  openNodeInvoiceId: invoice.id ?? '',
                },
              },
            })
          }

          // Create lifetime purchase
          await createLifetimePurchase(userId, customerId, priceId, tx)
          console.log(`Successfully created lifetime purchase for user ${userId}`)
          return true
        } else {
          // Handle recurring subscription - reuse existing crypto subscription logic
          console.log(`OpenNode invoice ${invoice.id} is for a regular subscription`)

          // Find existing crypto subscription
          const existingSubscription = await tx.subscription.findFirst({
            where: {
              userId,
              stripeCustomerId: customerId,
              metadata: { path: ['isCryptoPayment'], equals: 'true' },
              NOT: { status: SubscriptionStatus.CANCELED },
            },
          })

          const { getCurrentPeriod } = await import('@/utils/subscription')
          const pricePeriod = getCurrentPeriod(priceId)

          if (existingSubscription) {
            // Handle renewal/upgrade
            const existingPriceId = existingSubscription.stripePriceId
            const existingPeriod = existingPriceId ? getCurrentPeriod(existingPriceId) : 'unknown'

            if (existingPeriod !== pricePeriod) {
              // This is an upgrade, cancel existing and create new
              await tx.subscription.update({
                where: { id: existingSubscription.id },
                data: {
                  status: SubscriptionStatus.CANCELED,
                  cancelAtPeriodEnd: true,
                  updatedAt: new Date(),
                  metadata: {
                    ...(typeof existingSubscription.metadata === 'object'
                      ? existingSubscription.metadata
                      : {}),
                    upgradedTo: pricePeriod,
                    upgradedAt: new Date().toISOString(),
                    openNodeInvoiceId: invoice.id ?? '',
                  },
                },
              })

              // Create fake session for createCryptoSubscription
              const fakeSession: Partial<Stripe.Checkout.Session> = {
                id: `opennode_${invoice.id}`,
                customer: customerId,
                metadata: { userId, isCryptoPayment: 'true', openNodeInvoiceId: invoice.id ?? '' },
              }

              return await createCryptoSubscription(
                userId,
                fakeSession as Stripe.Checkout.Session,
                priceId,
                customerId,
                tx,
                existingSubscription.currentPeriodEnd || new Date(),
              )
            } else {
              // This is a renewal - extend existing subscription
              return await handleCryptoRenewal(invoice, existingSubscription, tx, pricePeriod)
            }
          } else {
            // New crypto subscription
            const fakeSession: Partial<Stripe.Checkout.Session> = {
              id: `opennode_${invoice.id}`,
              customer: customerId,
              metadata: { userId, isCryptoPayment: 'true', openNodeInvoiceId: invoice.id ?? '' },
            }

            return await createCryptoSubscription(
              userId,
              fakeSession as Stripe.Checkout.Session,
              priceId,
              customerId,
              tx,
            )
          }
        }
      },
      `handleOpenNodeInvoicePaid(${invoice.id})`,
      userId || customerId,
    )) !== null
  )
}

/**
 * Handles crypto subscription renewal logic
 */
async function handleCryptoRenewal(
  invoice: Stripe.Invoice,
  subscription: any,
  tx: Prisma.TransactionClient,
  pricePeriod: string,
): Promise<boolean> {
  const isAnnual = pricePeriod === 'annual'
  const baseDate =
    subscription.currentPeriodEnd instanceof Date
      ? subscription.currentPeriodEnd
      : new Date(subscription.currentPeriodEnd || Date.now())

  const newPeriodEnd = new Date(baseDate)
  if (isAnnual) {
    newPeriodEnd.setFullYear(newPeriodEnd.getFullYear() + 1)
  } else {
    newPeriodEnd.setMonth(newPeriodEnd.getMonth() + 1)
  }

  // Update subscription with new period end
  await tx.subscription.update({
    where: { id: subscription.id },
    data: {
      status: SubscriptionStatus.ACTIVE,
      currentPeriodEnd: newPeriodEnd,
      cancelAtPeriodEnd: true,
      metadata: {
        ...(typeof subscription.metadata === 'object' ? subscription.metadata : {}),
        lastRenewalInvoiceId: invoice.id ?? '',
        renewedAt: new Date().toISOString(),
      },
      updatedAt: new Date(),
    },
  })

  return true
}

/**
 * Handles a Boomfi crypto invoice.paid event
 * @param invoice The Stripe invoice object with Boomfi fields
 * @param tx The transaction client
 * @returns True if the operation was successful, false otherwise
 */
async function handleBoomfiInvoicePaid(
  invoice: Stripe.Invoice,
  tx: Prisma.TransactionClient,
): Promise<boolean> {
  const customerId = invoice.customer as string

  // Extract user ID from metadata or try to find from customerId
  let userId = invoice.metadata?.userId

  if (!userId) {
    // Try to find user by customer ID
    const customer = await stripe.customers.retrieve(customerId)
    userId = (customer as Stripe.Customer).metadata?.userId

    if (!userId) {
      console.error(`No userId found for Boomfi invoice ${invoice.id} with customer ${customerId}`)
      return false
    }
  }

  console.log(
    `Processing Boomfi invoice.paid event for invoice ${invoice.id} with userId ${userId}`,
  )

  return (
    (await withErrorHandling(
      async () => {
        // First, try to get price ID from invoice metadata (most reliable for crypto payments)
        let priceId: string | null = invoice.metadata?.stripePriceId || null

        // If not in metadata, extract from line items (fallback)
        if (!priceId) {
          if (!invoice.lines?.data || invoice.lines.data.length === 0) {
            console.error(`No line items found in invoice ${invoice.id}`)
            return false
          }

          const lineItem = invoice.lines.data[0]

          // Extract price ID based on the parent type (new Stripe TypeScript types)
          if (
            lineItem.parent &&
            lineItem.pricing &&
            'price_details' in lineItem.pricing &&
            lineItem.pricing.price_details
          ) {
            priceId = lineItem.pricing.price_details.price
          }
        }

        if (!priceId) {
          console.error(`No price ID found in Boomfi invoice ${invoice.id}`)
          return false
        }

        console.log(`Found price ID ${priceId} in Boomfi invoice ${invoice.id}`)

        // Check for any existing crypto subscriptions that need to be cancelled
        // First, check if this is a lifetime purchase
        const isLifetime = await isLifetimePrice(priceId)

        if (isLifetime) {
          console.log(`Boomfi invoice ${invoice.id} is for a lifetime purchase`)

          // Find and cancel all active subscriptions
          const activeSubscriptions = await tx.subscription.findMany({
            where: {
              userId,
              NOT: {
                status: SubscriptionStatus.CANCELED,
              },
            },
          })

          console.log(
            `Found ${activeSubscriptions.length} active subscriptions to cancel for lifetime upgrade`,
          )

          // Cancel each active subscription
          for (const subscription of activeSubscriptions) {
            // If it's a regular Stripe subscription (not crypto), cancel it in Stripe
            if (
              subscription.stripeSubscriptionId &&
              !subscription.stripeSubscriptionId.startsWith('crypto_')
            ) {
              try {
                console.log(`Canceling Stripe subscription ${subscription.stripeSubscriptionId}`)
                await stripe.subscriptions.cancel(subscription.stripeSubscriptionId, {
                  invoice_now: false,
                  prorate: true,
                })
              } catch (error) {
                console.error(
                  `Failed to cancel Stripe subscription ${subscription.stripeSubscriptionId}:`,
                  error,
                )
              }
            }

            // Update subscription status in our database
            await tx.subscription.update({
              where: { id: subscription.id },
              data: {
                status: SubscriptionStatus.CANCELED,
                cancelAtPeriodEnd: true,
                updatedAt: new Date(),
                metadata: {
                  ...(typeof subscription.metadata === 'object' ? subscription.metadata : {}),
                  upgradedToLifetime: 'true',
                  upgradedAt: new Date().toISOString(),
                  boomfiInvoiceId: invoice.id ?? '',
                },
              },
            })

            console.log(
              `Marked subscription ${subscription.id} as canceled due to lifetime upgrade`,
            )

            // If it's a crypto subscription with a renewal invoice, void the invoice
            if (subscription.metadata) {
              const metadata = (subscription.metadata as Record<string, unknown>) || {}
              const renewalInvoiceId = metadata.renewalInvoiceId as string

              if (renewalInvoiceId) {
                try {
                  console.log(`Voiding renewal invoice ${renewalInvoiceId} due to lifetime upgrade`)
                  await stripe.invoices.voidInvoice(renewalInvoiceId)
                  console.log(`Successfully voided invoice ${renewalInvoiceId}`)
                } catch (invoiceError) {
                  console.error(`Failed to void invoice ${renewalInvoiceId}:`, invoiceError)
                }
              }
            }
          }

          // Create lifetime purchase
          console.log(`Creating lifetime subscription for user ${userId} from Boomfi invoice`)
          await createLifetimePurchase(userId, customerId, priceId, tx)
          return true
        } else {
          // Handle non-lifetime subscriptions from Boomfi
          console.log(`Boomfi invoice ${invoice.id} is for a regular subscription`)

          // Check for existing crypto subscription to handle renewals
          const existingSubscription = await tx.subscription.findFirst({
            where: {
              userId,
              stripeCustomerId: customerId,
              metadata: {
                path: ['isCryptoPayment'],
                equals: 'true',
              },
              NOT: {
                status: SubscriptionStatus.CANCELED,
              },
            },
          })

          // Determine subscription period
          const { getCurrentPeriod } = await import('@/utils/subscription')
          const pricePeriod = getCurrentPeriod(priceId)
          console.log(`Detected Boomfi subscription period: ${pricePeriod}`)

          if (existingSubscription) {
            console.log(
              `Found existing crypto subscription ${existingSubscription.id} - handling as renewal/upgrade`,
            )

            // Check if this is a change in subscription period
            const existingPriceId = existingSubscription.stripePriceId
            const existingPeriod = existingPriceId
              ? getCurrentPeriod(existingPriceId as string)
              : 'unknown'

            // If changing from monthly to annual or vice versa, handle it as an upgrade
            if (
              existingPeriod !== pricePeriod &&
              (existingPeriod === 'monthly' || existingPeriod === 'annual') &&
              (pricePeriod === 'monthly' || pricePeriod === 'annual')
            ) {
              console.log(`Processing subscription change from ${existingPeriod} to ${pricePeriod}`)

              // Cancel the existing subscription
              await tx.subscription.update({
                where: { id: existingSubscription.id },
                data: {
                  status: SubscriptionStatus.CANCELED,
                  cancelAtPeriodEnd: true,
                  updatedAt: new Date(),
                  metadata: {
                    ...(typeof existingSubscription.metadata === 'object'
                      ? existingSubscription.metadata
                      : {}),
                    upgradedTo: pricePeriod,
                    upgradedAt: new Date().toISOString(),
                    previousPriceId: existingPriceId,
                    boomfiInvoiceId: invoice.id ?? '',
                  },
                },
              })

              // Create a fake session for createCryptoSubscription
              const fakeSession: Partial<Stripe.Checkout.Session> = {
                id: `boomfi_${invoice.id}`,
                customer: customerId,
                metadata: {
                  userId,
                  isCryptoPayment: 'true',
                  boomfiInvoiceId: invoice.id ?? '',
                },
              }

              // Calculate the new period end date based on when the previous subscription would have ended
              const currentEndDate = existingSubscription.currentPeriodEnd || new Date()

              // Create a new subscription for the new period
              console.log(
                `Creating new ${pricePeriod} subscription to replace canceled ${existingPeriod} subscription`,
              )
              return await createCryptoSubscription(
                userId,
                fakeSession as Stripe.Checkout.Session,
                priceId,
                customerId,
                tx,
                currentEndDate, // Pass the current end date to ensure they don't lose time
              )
            } else {
              // This is a renewal of the same period, extend the current subscription
              console.log(
                `Processing renewal for existing ${existingPeriod} subscription ${existingSubscription.id}`,
              )

              // Calculate new period end date
              const isAnnual = pricePeriod === 'annual'

              // Handle the Date properly, considering currentPeriodEnd could be a Date object or string
              let baseDate: Date
              if (existingSubscription.currentPeriodEnd) {
                // Handle if it's already a Date or needs to be converted from string
                baseDate =
                  existingSubscription.currentPeriodEnd instanceof Date
                    ? existingSubscription.currentPeriodEnd
                    : new Date(existingSubscription.currentPeriodEnd)
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

              try {
                // Create a new draft invoice for the next period
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
                    previousInvoiceId: invoice.id ?? '',
                    boomfiPayment: 'true',
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
                  where: { id: existingSubscription.id },
                  data: {
                    status: SubscriptionStatus.ACTIVE,
                    currentPeriodEnd: newPeriodEnd,
                    cancelAtPeriodEnd: true, // Will expire at the end of the period
                    metadata: {
                      ...(typeof existingSubscription.metadata === 'object'
                        ? existingSubscription.metadata
                        : {}),
                      priceType: pricePeriod,
                      previousRenewalInvoiceId: invoice.id ?? '',
                      renewalInvoiceId: newInvoice.id,
                      renewalDueDate: renewalDate.toISOString(),
                      boomfiInvoiceId: invoice.id ?? '',
                    },
                    updatedAt: new Date(),
                  },
                })

                console.log(
                  `Updated crypto subscription ${existingSubscription.id} with new period end ${newPeriodEnd.toISOString()} and new invoice ID ${newInvoice.id}`,
                )

                return true
              } catch (error) {
                console.error('Failed to create next crypto renewal invoice:', error)

                // Still update the subscription period
                await tx.subscription.update({
                  where: { id: existingSubscription.id },
                  data: {
                    status: SubscriptionStatus.ACTIVE,
                    currentPeriodEnd: newPeriodEnd,
                    cancelAtPeriodEnd: true,
                    metadata: {
                      ...(typeof existingSubscription.metadata === 'object'
                        ? existingSubscription.metadata
                        : {}),
                      renewalError: 'true',
                      boomfiInvoiceId: invoice.id ?? '',
                    },
                    updatedAt: new Date(),
                  },
                })

                return false
              }
            }
          } else {
            // This is a new subscription from Boomfi
            console.log(`Creating new Boomfi crypto subscription for user ${userId}`)

            // Cancel any active regular subscriptions that should be replaced
            const activeRegularSubscriptions = await tx.subscription.findMany({
              where: {
                userId,
                NOT: {
                  status: SubscriptionStatus.CANCELED,
                },
                stripeSubscriptionId: {
                  not: null,
                },
              },
              select: {
                id: true,
                stripeSubscriptionId: true,
                stripePriceId: true,
                metadata: true,
              },
            })

            // Filter out crypto subscriptions
            const regularTradfiSubscriptions = activeRegularSubscriptions.filter((sub) => {
              const metadata = (sub.metadata as Record<string, unknown>) || {}
              return metadata.isCryptoPayment !== 'true'
            })

            console.log(
              `Found ${regularTradfiSubscriptions.length} traditional finance subscriptions to check`,
            )

            // Cancel any regular Stripe subscriptions that match the period being purchased
            for (const regularSubscription of regularTradfiSubscriptions) {
              if (regularSubscription.stripeSubscriptionId) {
                // Check if the regular subscription is of the same period as the crypto one being purchased
                const regularPeriod = regularSubscription.stripePriceId
                  ? getCurrentPeriod(regularSubscription.stripePriceId as string)
                  : 'unknown'

                // Log for debugging
                console.log(
                  `Comparing regular subscription period ${regularPeriod} with crypto period ${pricePeriod}`,
                )

                // Check if we need to cancel (either same period or this is a lifetime purchase)
                const shouldCancel = pricePeriod === 'lifetime' || regularPeriod === pricePeriod

                if (shouldCancel) {
                  try {
                    console.log(
                      `Canceling regular Stripe subscription ${regularSubscription.stripeSubscriptionId} due to switch to crypto payment (${pricePeriod})`,
                    )

                    // Cancel in Stripe
                    await stripe.subscriptions.cancel(regularSubscription.stripeSubscriptionId, {
                      invoice_now: false,
                      prorate: true,
                    })

                    // Update in database
                    await tx.subscription.update({
                      where: { id: regularSubscription.id },
                      data: {
                        status: SubscriptionStatus.CANCELED,
                        cancelAtPeriodEnd: true,
                        updatedAt: new Date(),
                        metadata: {
                          ...(typeof regularSubscription.metadata === 'object'
                            ? regularSubscription.metadata
                            : {}),
                          switchedToCrypto: 'true',
                          switchedAt: new Date().toISOString(),
                          previousPriceId: regularSubscription.stripePriceId,
                          newCryptoPeriod: pricePeriod,
                          boomfiInvoiceId: invoice.id ?? '',
                        },
                      },
                    })

                    console.log(
                      `Successfully canceled and updated regular subscription ${regularSubscription.id}`,
                    )
                  } catch (error) {
                    console.error(
                      `Error canceling regular subscription ${regularSubscription.stripeSubscriptionId}:`,
                      error,
                    )
                  }
                }
              }
            }

            // Create a fake session for createCryptoSubscription
            const fakeSession: Partial<Stripe.Checkout.Session> = {
              id: `boomfi_${invoice.id}`,
              customer: customerId,
              metadata: {
                userId,
                isCryptoPayment: 'true',
                boomfiInvoiceId: invoice.id ?? '',
              },
            }

            // Create the new crypto subscription
            return await createCryptoSubscription(
              userId,
              fakeSession as Stripe.Checkout.Session,
              priceId,
              customerId,
              tx,
            )
          }
        }
      },
      `handleBoomfiInvoicePaid(${invoice.id})`,
      userId || customerId,
    )) !== null
  )
}
