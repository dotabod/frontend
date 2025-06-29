import type { Prisma } from '@prisma/client'
import { SubscriptionStatus } from '@prisma/client'
import type Stripe from 'stripe'
import { stripe } from '@/lib/stripe-server'
import { GiftService } from '../services/gift-service'
import { withErrorHandling } from '../utils/error-handling'
import {
  createCryptoSubscription,
  createLifetimePurchase,
  findExistingCryptoSubscription,
  isLifetimePrice,
} from '../utils/subscription-utils'
import { handleSubscriptionEvent } from './subscription-events'

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

          console.log(`Processing checkout completed for session ${session.id}`)

          // Handle lifetime upgrade
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

          // Handle crypto payments (one-time with renewal invoices)
          if (
            session.metadata?.isCryptoPayment === 'true' &&
            session.payment_status === 'paid' &&
            priceId
          ) {
            // Check for existing subscriptions to avoid duplicates
            const existingSubscription = await findExistingCryptoSubscription(
              userId,
              session.customer as string,
              session.id,
              tx,
            )

            // Get line items to determine the true price period directly from the checkout session
            const purchasedPriceId = lineItems.data[0]?.price?.id ?? null

            console.log(
              `Processing crypto payment with price ID: ${priceId}, from line items: ${purchasedPriceId}`,
            )

            // Determine the period of the crypto subscription being purchased
            const { getCurrentPeriod } = await import('@/utils/subscription')
            const cryptoPeriod = getCurrentPeriod(priceId)
            console.log(`Detected crypto subscription period: ${cryptoPeriod}`)

            // Check if the user has any active regular (non-crypto) subscriptions in Stripe
            // that need to be canceled when switching to crypto
            const activeRegularSubscriptions = await tx.subscription.findMany({
              where: {
                userId,
                NOT: {
                  status: SubscriptionStatus.CANCELED,
                },
                // Filter to only include Stripe regular subscriptions (not crypto)
                stripeSubscriptionId: {
                  not: null,
                },
                // We'll check for crypto payment flag in the code
              },
              select: {
                id: true,
                stripeSubscriptionId: true,
                stripePriceId: true,
                metadata: true,
              },
            })

            // Log number of regular subscriptions found
            console.log(
              `Found ${activeRegularSubscriptions.length} regular subscriptions to check for cancellation`,
            )

            // Filter out crypto subscriptions
            const regularTradfiSubscriptions = activeRegularSubscriptions.filter((sub) => {
              const metadata = (sub.metadata as Record<string, unknown>) || {}
              return metadata.isCryptoPayment !== 'true'
            })

            console.log(
              `Found ${regularTradfiSubscriptions.length} traditional finance subscriptions to check`,
            )

            // Cancel any regular Stripe subscriptions the user might have
            // This handles the case of switching from traditional finance to crypto
            for (const regularSubscription of regularTradfiSubscriptions) {
              if (regularSubscription.stripeSubscriptionId) {
                // Check if the regular subscription is of the same period as the crypto one being purchased
                const regularPeriod = regularSubscription.stripePriceId
                  ? getCurrentPeriod(regularSubscription.stripePriceId as string)
                  : 'unknown'

                // Log for debugging
                console.log(
                  `Comparing regular subscription period ${regularPeriod} with crypto period ${cryptoPeriod}`,
                )

                // Check if we need to cancel (either same period or this is a lifetime purchase)
                const shouldCancel = cryptoPeriod === 'lifetime' || regularPeriod === cryptoPeriod

                if (shouldCancel) {
                  try {
                    console.log(
                      `Canceling regular Stripe subscription ${regularSubscription.stripeSubscriptionId} due to switch to crypto payment (${cryptoPeriod})`,
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
                          newCryptoPeriod: cryptoPeriod,
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
                } else {
                  console.log(
                    `Keeping regular subscription ${regularSubscription.id} as it's a different period (${regularPeriod} vs ${cryptoPeriod})`,
                  )
                }
              }
            }

            // Handle lifetime upgrade from existing crypto subscription
            const isLifetime = await isLifetimePrice(priceId)

            // Add explicit log for debugging subscription type issues
            console.log(
              `Crypto payment for session ${session.id}, detected as lifetime: ${isLifetime}`,
            )

            // If the user has an existing subscription with a pending invoice, cancel it
            if (existingSubscription?.metadata) {
              const metadata = (existingSubscription.metadata as Record<string, unknown>) || {}
              const renewalInvoiceId = metadata.renewalInvoiceId as string

              if (renewalInvoiceId) {
                try {
                  console.log(
                    `Canceling pending invoice ${renewalInvoiceId} for user ${userId} after successful checkout`,
                  )
                  // Try to void the invoice first
                  await stripe.invoices.voidInvoice(renewalInvoiceId)
                  console.log(`Successfully voided invoice ${renewalInvoiceId} after upgrade`)
                } catch (invoiceError) {
                  // If invoice is already finalized, try to mark it as uncollectible
                  try {
                    const invoice = await stripe.invoices.retrieve(renewalInvoiceId)
                    if (invoice.status === 'open') {
                      await stripe.invoices.markUncollectible(renewalInvoiceId)
                      console.log(
                        `Marked invoice ${renewalInvoiceId} as uncollectible after upgrade`,
                      )
                    }
                  } catch (markError) {
                    console.error(
                      `Failed to handle invoice ${renewalInvoiceId} after upgrade:`,
                      markError,
                    )
                  }
                }
              }
            }

            // Double-check the product name/description to ensure we're creating the right type of subscription
            if (isLifetime) {
              console.log(`Lifetime price detected for crypto payment in session ${session.id}`)

              // Find and cancel ALL active subscriptions for this user
              const activeSubscriptions = await tx.subscription.findMany({
                where: {
                  userId,
                  NOT: {
                    status: SubscriptionStatus.CANCELED,
                  },
                },
              })

              // Log how many active subscriptions were found
              console.log(
                `Found ${activeSubscriptions.length} active subscriptions to cancel for user ${userId}`,
              )

              // Cancel each active subscription
              for (const subscription of activeSubscriptions) {
                // If it's a regular Stripe subscription (not crypto), cancel it in Stripe
                if (
                  subscription.stripeSubscriptionId &&
                  !subscription.stripeSubscriptionId.startsWith('crypto_')
                ) {
                  try {
                    console.log(
                      `Canceling Stripe subscription ${subscription.stripeSubscriptionId}`,
                    )
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
                      console.log(
                        `Voiding renewal invoice ${renewalInvoiceId} due to lifetime upgrade`,
                      )
                      await stripe.invoices.voidInvoice(renewalInvoiceId)
                      console.log(`Successfully voided invoice ${renewalInvoiceId}`)
                    } catch (invoiceError) {
                      console.error(`Failed to void invoice ${renewalInvoiceId}:`, invoiceError)
                    }
                  }
                }
              }

              // Create lifetime purchase
              console.log(`Creating lifetime subscription for user ${userId}`)
              await createLifetimePurchase(userId, session.customer as string, priceId, tx)
              return true
            }

            if (existingSubscription) {
              console.log(
                `Skipping crypto subscription creation - subscription ${existingSubscription.id} already exists`,
              )

              // NEW CODE: Check if this is an upgrade from monthly to annual or vice versa
              const existingPriceId = existingSubscription.stripePriceId

              if (existingPriceId && priceId && existingPriceId !== priceId) {
                // This is an upgrade/change between subscription periods (monthly <-> annual)
                console.log(
                  `Detected subscription change from ${existingPriceId} to ${priceId} for user ${userId}`,
                )

                // Import utils to determine periods
                const { getCurrentPeriod } = await import('@/utils/subscription')
                const oldPeriod = getCurrentPeriod(existingPriceId)
                const newPeriod = getCurrentPeriod(priceId)

                if (
                  oldPeriod !== newPeriod &&
                  (oldPeriod === 'monthly' || oldPeriod === 'annual') &&
                  (newPeriod === 'monthly' || newPeriod === 'annual')
                ) {
                  console.log(`Processing subscription upgrade from ${oldPeriod} to ${newPeriod}`)

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
                        upgradedTo: newPeriod,
                        upgradedAt: new Date().toISOString(),
                        previousPriceId: existingPriceId,
                      },
                    },
                  })

                  // Create a new subscription with the new period
                  // Calculate the new period end date based on when the previous subscription would have ended
                  // This ensures they don't lose time they've already paid for
                  const currentEndDate = existingSubscription.currentPeriodEnd || new Date()

                  // Create a new subscription for the new period
                  console.log(
                    `Creating new ${newPeriod} subscription to replace canceled ${oldPeriod} subscription`,
                  )
                  return await createCryptoSubscription(
                    userId,
                    session,
                    priceId,
                    session.customer as string,
                    tx,
                    currentEndDate, // Pass the current end date to ensure they don't lose time
                  )
                }
              }

              return true
            }

            // For non-lifetime crypto subscriptions
            console.log(`Creating regular crypto subscription for session ${session.id}`)
            return await createCryptoSubscription(
              userId,
              session,
              priceId,
              session.customer as string,
              tx,
            )
          }

          // Handle lifetime purchases
          if (priceId) {
            // Verify this is actually a lifetime price before creating a lifetime subscription
            const isLifetime = await isLifetimePrice(priceId)

            if (!isLifetime) {
              console.log(
                `Skipping lifetime subscription creation for non-lifetime price: ${priceId}`,
              )
              return true
            }

            console.log(`Creating lifetime subscription for verified lifetime price ${priceId}`)

            // Find and cancel ALL active subscriptions for this user
            const activeSubscriptions = await tx.subscription.findMany({
              where: {
                userId,
                NOT: {
                  status: SubscriptionStatus.CANCELED,
                },
              },
            })

            // Log how many active subscriptions were found
            console.log(
              `Found ${activeSubscriptions.length} active subscriptions to cancel for user ${userId}`,
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
                    console.log(
                      `Voiding renewal invoice ${renewalInvoiceId} due to lifetime upgrade`,
                    )
                    await stripe.invoices.voidInvoice(renewalInvoiceId)
                    console.log(`Successfully voided invoice ${renewalInvoiceId}`)
                  } catch (invoiceError) {
                    console.error(`Failed to void invoice ${renewalInvoiceId}:`, invoiceError)
                  }
                }
              }
            }

            // Create the lifetime purchase
            console.log(
              `Creating lifetime purchase for user ${userId} because price ID ${priceId} is a lifetime price`,
            )
            await createLifetimePurchase(userId, session.customer as string, priceId, tx)
            return true
          }

          console.error(
            `Skipping subscription creation - no price ID found for session ${session.id}`,
          )
          return true
        }

        return false
      },
      `handleCheckoutCompleted(${session.id})`,
      session.metadata?.userId,
    )) !== null
  )
}
