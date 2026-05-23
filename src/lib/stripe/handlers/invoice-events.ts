import { Prisma, SubscriptionStatus, TransactionType } from '@prisma/client'
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
  if (invoice.id) {
    await tx.$executeRaw(Prisma.sql`SELECT pg_advisory_xact_lock(hashtext(${invoice.id}))`)
  }

  // Check for OpenNode crypto payment
  if (
    invoice.status === 'paid' &&
    invoice.metadata?.paymentProvider === 'opennode' &&
    invoice.metadata?.isCryptoPayment === 'true'
  ) {
    return await handleOpenNodeInvoicePaid(invoice, tx)
  }

  // Handle regular crypto payment invoices
  if (invoice.metadata?.isCryptoPayment === 'true') {
    return await handleCryptoInvoiceEvent(invoice, tx)
  }

  const subscriptionId = getInvoiceSubscriptionId(invoice)

  // Regular subscription invoices
  if (!subscriptionId) {
    console.log(
      `Skipping invoice event ${invoice.id}: no subscription on first line item (status: ${invoice.status})`,
    )
    return true
  }

  return (
    (await withErrorHandling(
      async () => {
        const subscription = await stripe.subscriptions.retrieve(subscriptionId)
        // Map Stripe status to our internal status
        const status = mapStripeStatus(subscription.status)
        const currentPeriodEnd = new Date(subscription.items.data[0]?.current_period_end * 1000)

        // Update the subscription record with the latest status
        await tx.subscription.updateMany({
          data: {
            cancelAtPeriodEnd: subscription.cancel_at_period_end,
            currentPeriodEnd,
            status,
            updatedAt: new Date(),
          },
          where: { stripeSubscriptionId: subscription.id },
        })

        return true
      },
      `handleInvoiceEvent(${invoice.id})`,
      invoice.customer as string,
    )) !== null
  )
}

function getInvoiceSubscriptionId(invoice: Stripe.Invoice): string | null {
  const firstLineItem = invoice.lines.data[0]

  if (!firstLineItem) {
    return null
  }

  if (firstLineItem.subscription) {
    return firstLineItem.subscription as string
  }

  const { parent } = firstLineItem
  if (
    parent &&
    parent.type === 'subscription_item_details' &&
    parent.subscription_item_details?.subscription
  ) {
    return parent.subscription_item_details.subscription
  }

  return null
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
  const resolvedUser = await resolveUserIdForCryptoInvoice(invoice, tx)
  const userId = resolvedUser?.userId ?? null

  if (resolvedUser) {
    console.log(
      JSON.stringify({
        customerId,
        event: 'crypto_user_resolution',
        invoiceId: invoice.id,
        source: resolvedUser.source,
        userId,
      }),
    )
  }

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
            metadata: {
              equals: invoice.id,
              path: ['renewalInvoiceId'],
            },
            stripeCustomerId: customerId,
          },
        })

        if (!subscription) {
          console.log(`No subscription found with renewalInvoiceId: ${invoice.id}`)
          // If we have an overdue or uncollectible invoice but no subscription with this invoice ID,
          // Try to find by customer ID (for current period invoices)
          if (
            invoice.status === 'uncollectible' ||
            invoice.status === 'void' ||
            (invoice.status === 'open' &&
              invoice.due_date &&
              new Date(invoice.due_date * 1000) < new Date())
          ) {
            const activeSubscription = await tx.subscription.findFirst({
              where: {
                status: { in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.PAST_DUE] },
                stripeCustomerId: customerId,
                userId,
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
                data: {
                  metadata: {
                    ...(typeof activeSubscription.metadata === 'object'
                      ? activeSubscription.metadata
                      : {}),
                    lastInvoiceStatus: invoice.status,
                    lastUnpaidInvoiceId: invoice.id,
                  },
                  status: newStatus,
                  updatedAt: new Date(),
                },
                where: { id: activeSubscription.id },
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
              auto_advance: true, // Enable automatic advancement so Stripe handles finalization
              automatically_finalizes_at: Math.floor(renewalDate.getTime() / 1000),
              collection_method: 'send_invoice',
              customer: customerId,
              description: `Crypto Dotabod Pro ${pricePeriod.charAt(0).toUpperCase() + pricePeriod.slice(1)} subscription`,
              due_date: Math.floor((renewalDate.getTime() + 7 * 24 * 60 * 60 * 1000) / 1000), // Due date 7 days after finalization date
              metadata: {
                isCryptoPayment: 'true',
                isRenewalInvoice: 'true',
                previousInvoiceId: invoice.id ?? '',
                pricePeriod,
                userId,
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
              amount: price.unit_amount,
              customer: customerId,
              description: `Crypto Dotabod Pro ${pricePeriod.charAt(0).toUpperCase() + pricePeriod.slice(1)} subscription`,
              invoice: newInvoice.id,
            })

            console.log(
              `Created new renewal draft invoice ${newInvoice.id} for next crypto payment period`,
            )

            // Update the subscription with the new period end and invoice ID
            await tx.subscription.update({
              data: {
                cancelAtPeriodEnd: true, // Will expire at the end of the period
                currentPeriodEnd: newPeriodEnd,
                metadata: {
                  ...(typeof subscription.metadata === 'object' ? subscription.metadata : {}),
                  previousRenewalInvoiceId: invoice.id ?? '',
                  priceType: pricePeriod,
                  renewalDueDate: renewalDate.toISOString(),
                  renewalInvoiceId: newInvoice.id,
                },
                status: SubscriptionStatus.ACTIVE,
                updatedAt: new Date(),
              },
              where: { id: subscription.id },
            })

            console.log(
              `Updated crypto subscription ${subscription.id} with new period end ${newPeriodEnd.toISOString()} and new invoice ID ${newInvoice.id}`,
            )

            return true
          } catch (error) {
            console.error('Failed to create next crypto renewal invoice:', error)

            // Still update the subscription period
            await tx.subscription.update({
              data: {
                cancelAtPeriodEnd: true,
                currentPeriodEnd: newPeriodEnd,
                metadata: {
                  ...(typeof subscription.metadata === 'object' ? subscription.metadata : {}),
                  renewalError: 'true',
                },
                status: SubscriptionStatus.ACTIVE,
                updatedAt: new Date(),
              },
              where: { id: subscription.id },
            })

            return false
          }
        } else if (invoice.status === 'uncollectible' || invoice.status === 'void') {
          // Mark the subscription as inactive if the invoice is void or uncollectible
          await tx.subscription.update({
            data: {
              metadata: {
                ...(typeof subscription.metadata === 'object' ? subscription.metadata : {}),
                cancellationReason: 'invoice_uncollectible',
                lastUnpaidInvoiceId: invoice.id,
              },
              status: SubscriptionStatus.CANCELED,
              updatedAt: new Date(),
            },
            where: { id: subscription.id },
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
            data: {
              metadata: {
                ...(typeof subscription.metadata === 'object' ? subscription.metadata : {}),
                lastOverdueInvoiceId: invoice.id,
              },
              status: SubscriptionStatus.PAST_DUE,
              updatedAt: new Date(),
            },
            where: { id: subscription.id },
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
    case 'active': {
      return SubscriptionStatus.ACTIVE
    }
    case 'trialing': {
      return SubscriptionStatus.TRIALING
    }
    case 'past_due': {
      return SubscriptionStatus.PAST_DUE
    }
    case 'canceled': {
      return SubscriptionStatus.CANCELED
    }
    case 'unpaid': {
      return SubscriptionStatus.PAST_DUE
    }
    case 'incomplete': {
      return SubscriptionStatus.PAST_DUE
    }
    case 'incomplete_expired': {
      return SubscriptionStatus.CANCELED
    }
    default: {
      return SubscriptionStatus.CANCELED
    }
  }
}

type CryptoUserResolutionSource =
  | 'invoice_metadata'
  | 'customer_metadata'
  | 'opennode_charge'
  | 'subscription_lookup'

async function resolveUserIdForCryptoInvoice(
  invoice: Stripe.Invoice,
  tx: Prisma.TransactionClient,
): Promise<{ userId: string; source: CryptoUserResolutionSource } | null> {
  if (invoice.metadata?.userId) {
    return { source: 'invoice_metadata', userId: invoice.metadata.userId }
  }

  const customerId = typeof invoice.customer === 'string' ? invoice.customer : null

  if (!customerId) {
    return null
  }

  try {
    const customer = await stripe.customers.retrieve(customerId)
    if (!customer.deleted && customer.metadata?.userId) {
      return { source: 'customer_metadata', userId: customer.metadata.userId }
    }
  } catch (error) {
    console.error(`Failed to resolve userId from customer ${customerId}:`, error)
  }

  const openNodeCharge = await tx.openNodeCharge.findUnique({
    select: { userId: true },
    where: { stripeInvoiceId: invoice.id },
  })

  if (openNodeCharge?.userId) {
    return { source: 'opennode_charge', userId: openNodeCharge.userId }
  }

  const existingSubscription = await tx.subscription.findFirst({
    orderBy: { updatedAt: 'desc' },
    select: { userId: true },
    where: {
      NOT: { status: SubscriptionStatus.CANCELED },
      stripeCustomerId: customerId,
    },
  })

  if (existingSubscription?.userId) {
    return { source: 'subscription_lookup', userId: existingSubscription.userId }
  }

  return null
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
  const resolvedUser = await resolveUserIdForCryptoInvoice(invoice, tx)
  const userId = resolvedUser?.userId ?? null

  if (resolvedUser) {
    console.log(
      JSON.stringify({
        customerId,
        event: 'opennode_user_resolution',
        invoiceId: invoice.id,
        source: resolvedUser.source,
        userId,
      }),
    )
  }

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

          const existingLifetimePurchase = await tx.subscription.findFirst({
            select: { id: true },
            where: {
              status: SubscriptionStatus.ACTIVE,
              transactionType: TransactionType.LIFETIME,
              userId,
            },
          })

          if (existingLifetimePurchase) {
            console.log(
              `Skipping OpenNode lifetime creation for invoice ${invoice.id}; active lifetime subscription ${existingLifetimePurchase.id} already exists`,
            )
            return true
          }

          // Find and cancel all active subscriptions
          const activeSubscriptions = await tx.subscription.findMany({
            where: {
              NOT: { status: SubscriptionStatus.CANCELED },
              transactionType: { not: TransactionType.LIFETIME },
              userId,
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

            // Void/delete any pending renewal invoices for crypto subscriptions
            if (subscription.metadata) {
              const metadata = (subscription.metadata as Record<string, unknown>) || {}
              const renewalInvoiceId = metadata.renewalInvoiceId as string

              if (renewalInvoiceId) {
                try {
                  console.log(
                    `Canceling renewal invoice ${renewalInvoiceId} due to lifetime upgrade`,
                  )
                  // Retrieve the invoice to check its status
                  const invoice = await stripe.invoices.retrieve(renewalInvoiceId)

                  if (invoice.status === 'draft') {
                    // Draft invoices must be deleted, not voided
                    await stripe.invoices.del(renewalInvoiceId)
                    console.log(`Successfully deleted draft invoice ${renewalInvoiceId}`)
                  } else if (invoice.status === 'open') {
                    // Open invoices can be voided
                    await stripe.invoices.voidInvoice(renewalInvoiceId)
                    console.log(`Successfully voided open invoice ${renewalInvoiceId}`)
                  } else {
                    console.log(
                      `Invoice ${renewalInvoiceId} is already ${invoice.status}, no action needed`,
                    )
                  }
                } catch (invoiceError) {
                  console.error(`Failed to cancel invoice ${renewalInvoiceId}:`, invoiceError)
                }
              }
            }

            await tx.subscription.update({
              data: {
                cancelAtPeriodEnd: true,
                metadata: {
                  ...(typeof subscription.metadata === 'object' ? subscription.metadata : {}),
                  openNodeInvoiceId: invoice.id ?? '',
                  upgradedAt: new Date().toISOString(),
                  upgradedToLifetime: 'true',
                },
                status: SubscriptionStatus.CANCELED,
                updatedAt: new Date(),
              },
              where: { id: subscription.id },
            })
          }

          // Create lifetime purchase
          await createLifetimePurchase(userId, customerId, priceId, tx, {
            isCryptoPayment: 'true',
            openNodeInvoiceId: invoice.id ?? '',
            paymentProvider: 'opennode',
          })
          console.log(`Successfully created lifetime purchase for user ${userId}`)
          return true
        }
        // Handle recurring subscription - reuse existing crypto subscription logic
        console.log(`OpenNode invoice ${invoice.id} is for a regular subscription`)

        // Find existing crypto subscription
        const existingSubscription = await tx.subscription.findFirst({
          where: {
            NOT: { status: SubscriptionStatus.CANCELED },
            metadata: { equals: 'true', path: ['isCryptoPayment'] },
            stripeCustomerId: customerId,
            userId,
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
              data: {
                cancelAtPeriodEnd: true,
                metadata: {
                  ...(typeof existingSubscription.metadata === 'object'
                    ? existingSubscription.metadata
                    : {}),
                  openNodeInvoiceId: invoice.id ?? '',
                  upgradedAt: new Date().toISOString(),
                  upgradedTo: pricePeriod,
                },
                status: SubscriptionStatus.CANCELED,
                updatedAt: new Date(),
              },
              where: { id: existingSubscription.id },
            })

            // Create fake session for createCryptoSubscription
            const fakeSession: Partial<Stripe.Checkout.Session> = {
              customer: customerId,
              id: `opennode_${invoice.id}`,
              metadata: { isCryptoPayment: 'true', openNodeInvoiceId: invoice.id ?? '', userId },
            }

            return await createCryptoSubscription(
              userId,
              fakeSession as Stripe.Checkout.Session,
              priceId,
              customerId,
              tx,
              existingSubscription.currentPeriodEnd || new Date(),
            )
          }
          // This is a renewal - extend existing subscription
          return await handleCryptoRenewal(invoice, existingSubscription, tx, pricePeriod)
        }
        // New crypto subscription
        const fakeSession: Partial<Stripe.Checkout.Session> = {
          customer: customerId,
          id: `opennode_${invoice.id}`,
          metadata: { isCryptoPayment: 'true', openNodeInvoiceId: invoice.id ?? '', userId },
        }

        return await createCryptoSubscription(
          userId,
          fakeSession as Stripe.Checkout.Session,
          priceId,
          customerId,
          tx,
        )
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
  subscription: Prisma.SubscriptionGetPayload<object>,
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
    data: {
      cancelAtPeriodEnd: true,
      currentPeriodEnd: newPeriodEnd,
      metadata: {
        ...(typeof subscription.metadata === 'object' ? subscription.metadata : {}),
        lastRenewalInvoiceId: invoice.id ?? '',
        renewedAt: new Date().toISOString(),
      },
      status: SubscriptionStatus.ACTIVE,
      updatedAt: new Date(),
    },
    where: { id: subscription.id },
  })

  return true
}
