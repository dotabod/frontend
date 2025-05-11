import { stripe } from '@/lib/stripe-server'
import type { Prisma } from '@prisma/client'
import { SubscriptionStatus, TransactionType } from '@prisma/client'
import type Stripe from 'stripe'
import { withErrorHandling } from '../utils/error-handling'
import {
  createLifetimePurchase,
  findExistingCryptoSubscription,
  isLifetimePrice,
} from '../utils/subscription-utils'

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
  // Skip gift charges - these are handled by GiftService.processGiftCheckout
  if (charge.metadata?.isGift === 'true') {
    console.log(
      `Skipping charge succeeded event for gift charge ${charge.id} - handled by checkout events`,
    )
    return true
  }

  const userId = charge.metadata?.userId
  if (!userId) return false

  return (
    (await withErrorHandling(
      async () => {
        // Check if this is a crypto payment
        const isCryptoPayment = charge.payment_method_details?.type === 'crypto'

        if (isCryptoPayment && charge.payment_intent) {
          console.log(`Processing crypto payment for charge ${charge.id}`)

          // For crypto payments, we need to check if this is a recurring subscription payment
          // by looking up the checkout session that initiated this payment
          const sessions = await stripe.checkout.sessions.list({
            payment_intent: charge.payment_intent as string,
            limit: 1,
          })

          if (sessions.data.length > 0) {
            const session = sessions.data[0]
            console.log(`Found checkout session ${session.id} for crypto payment`)

            // If this is a crypto payment, check if we already created a subscription
            if (session.metadata?.isCryptoPayment === 'true') {
              // Check for existing subscription to avoid duplicates
              const existingSubscription = await findExistingCryptoSubscription(
                userId,
                charge.customer as string,
                session.id,
                tx,
              )

              if (existingSubscription) {
                console.log(
                  `Skipping subscription creation for crypto payment ${charge.id} - subscription ${existingSubscription.id} already exists`,
                )
                return true
              }

              // Get line items to find the price ID
              const lineItems = await stripe.checkout.sessions.listLineItems(session.id)
              const priceId = lineItems.data[0]?.price?.id ?? null

              // Also get product name for additional verification
              const productName = lineItems.data[0]?.description ?? 'unknown'
              console.log(`Crypto payment product: ${productName}, priceId: ${priceId}`)

              if (priceId) {
                // Check if this is a lifetime price
                const isLifetime = await isLifetimePrice(priceId)
                console.log(
                  `Crypto charge ${charge.id}: Price ${priceId} detected as lifetime: ${isLifetime}`,
                )

                // Only create a lifetime subscription if this is actually a lifetime price
                // AND the product name/description confirms it's a lifetime product
                if (isLifetime) {
                  const isConfirmedLifetime =
                    productName.toLowerCase().includes('lifetime') ||
                    productName.toLowerCase().includes('forever') ||
                    session.metadata?.productType === 'lifetime'

                  if (isConfirmedLifetime) {
                    console.log(
                      `Creating lifetime subscription for verified crypto lifetime payment ${charge.id}`,
                    )
                    await createLifetimePurchase(userId, charge.customer as string, priceId, tx)
                  } else {
                    console.log(
                      `WARNING: Price ${priceId} detected as lifetime but product name "${productName}" doesn't match. Skipping lifetime creation.`,
                    )
                  }
                } else {
                  console.log(
                    `Skipping lifetime subscription creation for non-lifetime crypto price: ${priceId}`,
                  )
                }
                return true
              }
            }
          }
        }

        // For non-crypto payments, we still need to verify this is a lifetime payment
        // by checking the associated checkout session and price ID
        if (charge.payment_intent) {
          const sessions = await stripe.checkout.sessions.list({
            payment_intent: charge.payment_intent as string,
            limit: 1,
          })

          if (sessions.data.length > 0) {
            const session = sessions.data[0]
            // Get line items to find the price ID
            const lineItems = await stripe.checkout.sessions.listLineItems(session.id)
            const priceId = lineItems.data[0]?.price?.id ?? null

            if (priceId) {
              // Check if this price is a lifetime price
              const isLifetime = await isLifetimePrice(priceId)

              if (!isLifetime) {
                console.log(
                  `Skipping lifetime subscription creation for non-lifetime price: ${priceId}`,
                )
                return true
              }

              // If it is a lifetime price, create the lifetime subscription with the correct price ID
              console.log(`Creating lifetime subscription for verified lifetime price ${priceId}`)
              await createLifetimePurchase(userId, charge.customer as string, priceId, tx)
              return true
            }
          }
        }

        // If we couldn't verify the price, don't create a lifetime subscription
        console.error(
          `Skipping lifetime subscription creation - could not verify price for charge ${charge.id}`,
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
  console.log(`Processing refund for charge ${charge.id}, amount: ${charge.amount_refunded}`)

  // Check if this is a gift refund
  if (charge.metadata?.isGift === 'true') {
    return (
      (await withErrorHandling(
        async () => {
          await handleGiftCreditRefund(charge, tx)
          return true
        },
        `handleGiftCreditRefund(${charge.id})`,
        charge.metadata?.gifterId || 'system',
      )) !== null
    )
  }

  // Process standard refunds with metadata
  const userId = charge.metadata?.userId
  if (userId) {
    console.log(`Found userId ${userId} in charge metadata`)
    return (
      (await withErrorHandling(
        async () => {
          // Process subscription updates for any subscription type
          await processSubscriptionRefund(userId, charge, tx)
          return true
        },
        `handleChargeRefunded(${charge.id})`,
        userId,
      )) !== null
    )
  }

  // Handle cases where metadata is missing but we have a payment intent
  if (charge.payment_intent) {
    console.log(`No userId in metadata, but found payment_intent ${charge.payment_intent}`)
    return (
      (await withErrorHandling(
        async () => {
          // Try to determine if this was a gift payment and handle accordingly
          if (await isGiftPayment(charge.payment_intent as string)) {
            await handleGiftCreditRefund(charge, tx)
            return true
          }

          // If not a gift payment, try to find the userId from the payment intent
          const userId = await getUserIdFromPaymentIntent(charge.payment_intent as string, tx)
          if (userId) {
            console.log(`Found userId ${userId} from payment intent lookup`)
            // Process the refund with the retrieved userId
            await processSubscriptionRefund(userId, charge, tx)
            return true
          }

          console.log(`Unable to find userId for payment intent ${charge.payment_intent}`)
          return true
        },
        `handleChargeRefunded(${charge.id})`,
        'system',
      )) !== null
    )
  }

  console.log(`Unable to process refund for charge ${charge.id}: no userId or payment_intent`)
  return false
}

/**
 * Checks if a payment intent is associated with a gift checkout
 */
async function isGiftPayment(paymentIntentId: string): Promise<boolean> {
  try {
    const sessions = await stripe.checkout.sessions.list({
      payment_intent: paymentIntentId,
      limit: 1,
    })

    if (sessions.data.length === 0) return false

    return sessions.data[0].metadata?.isGift === 'true'
  } catch (error) {
    console.error(`Error checking if payment intent ${paymentIntentId} is a gift:`, error)
    return false
  }
}

/**
 * Handles a gift credit refund by reversing the customer balance credit
 * @param charge The Stripe charge object with refund information
 * @param tx The transaction client
 */
async function handleGiftCreditRefund(
  charge: Stripe.Charge,
  tx: Prisma.TransactionClient,
): Promise<void> {
  // Only process full or partial refunds
  if (charge.amount_refunded <= 0) {
    console.log(`Skipping charge ${charge.id}: no refund amount`)
    return
  }

  // Find the checkout session associated with this charge
  const paymentIntent = typeof charge.payment_intent === 'string' ? charge.payment_intent : null

  if (!paymentIntent) {
    console.log(`Skipping charge ${charge.id}: no string payment intent`)
    return
  }

  console.log(`Looking up checkout session for payment intent ${paymentIntent}`)
  const sessions = await stripe.checkout.sessions.list({
    payment_intent: paymentIntent,
    limit: 1,
  })

  if (sessions.data.length === 0) {
    console.log(`No checkout session found for payment intent ${paymentIntent}`)
    return
  }

  const session = sessions.data[0]
  console.log(`Found checkout session ${session.id} for payment intent ${paymentIntent}`)

  // Verify this is a gift
  if (session.metadata?.isGift !== 'true') {
    console.log(`Checkout session ${session.id} is not a gift`)
    return
  }

  const recipientUserId = session.metadata?.recipientUserId
  if (!recipientUserId) {
    console.log(`Checkout session ${session.id} has no recipientUserId`)
    return
  }

  // Find the recipient's customer ID
  const user = await tx.user.findUnique({
    where: { id: recipientUserId },
    include: {
      subscription: {
        where: {
          stripeCustomerId: { not: null },
        },
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
  })

  const customerId = user?.subscription[0]?.stripeCustomerId
  if (!customerId) {
    console.log(`No Stripe customer ID found for user ${recipientUserId}`)
    return
  }

  console.log(
    `Processing gift credit refund for recipient ${recipientUserId} with customer ${customerId}`,
  )

  // Look for the gift transaction record in our database
  const giftTransaction = await tx.giftTransaction.findFirst({
    where: {
      OR: [
        { metadata: { path: ['checkoutSessionId'], equals: session.id } },
        { metadata: { path: ['paymentIntentId'], equals: paymentIntent } },
        { stripeSessionId: session.id },
      ],
    },
    include: {
      giftSubscription: true,
    },
  })

  if (giftTransaction) {
    console.log(`Found gift transaction record ${giftTransaction.id} for refund`)

    // Calculate the refund amount as a positive number for the reversal
    // If it's a partial refund, calculate the proportion of the credit to reverse
    const originalAmount = giftTransaction.amount
    const refundProportion = charge.amount_refunded / charge.amount
    const refundAmount = Math.round(originalAmount * refundProportion)

    console.log(
      `Calculated refund amount: ${refundAmount} (${refundProportion * 100}% of ${originalAmount})`,
    )

    try {
      // Record the refund in our gift transaction
      await tx.giftTransaction.update({
        where: { id: giftTransaction.id },
        data: {
          updatedAt: new Date(),
          metadata: {
            ...((giftTransaction.metadata as Record<string, unknown>) || {}),
            refundedAt: new Date().toISOString(),
            refundAmount: refundAmount.toString(),
            refundProportion: refundProportion.toString(),
            refundId: charge.refunds?.data?.[0]?.id || null,
          },
        },
      })

      // For customer balance credits, create a positive balance transaction to offset the credit
      // This effectively "cancels out" the original negative credit amount
      const balanceTransaction = await stripe.customers.createBalanceTransaction(customerId, {
        amount: refundAmount, // Positive amount to reverse the credit
        currency: giftTransaction.currency,
        description: `Refund of gift credit from ${giftTransaction.giftSubscription?.senderName || 'Anonymous'}`,
        metadata: {
          originalTransactionId: giftTransaction.id,
          refundId: charge.refunds?.data?.[0]?.id || null,
          refundedAt: new Date().toISOString(),
          isRefund: 'true',
        },
      })

      console.log(
        `Successfully created balance transaction ${balanceTransaction.id} to reverse gift credit`,
      )

      // If this was a full refund, also mark the gift subscription record as canceled
      if (charge.refunded && giftTransaction.giftSubscriptionId) {
        await tx.subscription.updateMany({
          where: {
            giftDetails: {
              id: giftTransaction.giftSubscriptionId,
            },
          },
          data: {
            status: SubscriptionStatus.CANCELED,
            updatedAt: new Date(),
            metadata: {
              refundedAt: new Date().toISOString(),
              refundId: charge.refunds?.data?.[0]?.id || null,
            },
          },
        })

        console.log(
          `Marked gift subscription ${giftTransaction.giftSubscriptionId} as canceled due to refund`,
        )
      }
    } catch (error) {
      console.error('Error processing gift credit refund:', error)
      throw error // Rethrow to be caught by withErrorHandling
    }
  } else {
    console.log(`No gift transaction record found for refund of checkout ${session.id}`)

    // Create a basic reversal based on session metadata
    if (customerId && session.metadata?.giftType && session.metadata?.giftQuantity) {
      try {
        const giftType = session.metadata.giftType
        const giftQuantity = Number.parseInt(session.metadata.giftQuantity, 10) || 1

        // Calculate an approximate refund amount based on standard pricing
        const priceMap = {
          monthly:
            Number.parseInt(process.env.MONTHLY_SUBSCRIPTION_PRICE_CENTS || '500', 10) *
            giftQuantity,
          annual:
            Number.parseInt(process.env.ANNUAL_SUBSCRIPTION_PRICE_CENTS || '4800', 10) *
            giftQuantity,
          lifetime:
            Number.parseInt(process.env.LIFETIME_SUBSCRIPTION_PRICE_CENTS || '30000', 10) *
            giftQuantity,
        }

        const refundAmount = priceMap[giftType as keyof typeof priceMap] || 0
        const refundProportion = charge.amount_refunded / charge.amount
        const finalRefundAmount = Math.round(refundAmount * refundProportion)

        console.log(`Calculated estimated refund amount: ${finalRefundAmount}`)

        if (finalRefundAmount > 0) {
          const balanceTransaction = await stripe.customers.createBalanceTransaction(customerId, {
            amount: finalRefundAmount,
            currency: 'usd',
            description: `Refund of estimated gift credit from ${session.metadata.giftSenderName || 'Anonymous'}`,
            metadata: {
              checkoutSessionId: session.id,
              paymentIntentId: paymentIntent,
              refundId: charge.refunds?.data?.[0]?.id || null,
              refundedAt: new Date().toISOString(),
              isRefund: 'true',
              isEstimated: 'true',
            },
          })

          console.log(`Created estimated balance transaction ${balanceTransaction.id} for refund`)
        } else {
          console.log('Could not calculate a valid refund amount, skipping balance transaction')
        }
      } catch (error) {
        console.error('Error creating estimated balance transaction for refund:', error)
      }
    }
  }
}

/**
 * Helper function to retrieve a userId from a payment intent
 * @param paymentIntentId The Stripe payment intent ID
 * @param tx The transaction client
 * @returns The user ID if found, null otherwise
 */
async function getUserIdFromPaymentIntent(
  paymentIntentId: string,
  tx: Prisma.TransactionClient,
): Promise<string | null> {
  try {
    // First, try to get the payment intent
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId)

    // Check if the payment intent has metadata with userId
    if (paymentIntent.metadata?.userId) {
      return paymentIntent.metadata.userId
    }

    // If no userId in metadata, check if there's a customer ID
    if (paymentIntent.customer) {
      const customerId =
        typeof paymentIntent.customer === 'string'
          ? paymentIntent.customer
          : paymentIntent.customer.id

      // Look up the subscription with this customer ID
      const subscription = await tx.subscription.findFirst({
        where: {
          stripeCustomerId: customerId,
        },
        orderBy: { createdAt: 'desc' },
      })

      if (subscription?.userId) {
        return subscription.userId
      }
    }

    // If we still don't have a userId, try to find it from checkout sessions
    const sessions = await stripe.checkout.sessions.list({
      payment_intent: paymentIntentId,
      limit: 1,
    })

    if (sessions.data.length > 0) {
      const session = sessions.data[0]

      // Check if the session has client_reference_id (which is often the userId)
      if (session.client_reference_id) {
        return session.client_reference_id
      }

      // Check session metadata
      if (session.metadata?.userId) {
        return session.metadata.userId
      }
    }

    return null
  } catch (error) {
    console.error(`Error retrieving userId from payment intent ${paymentIntentId}:`, error)
    return null
  }
}

/**
 * Processes subscription updates for a refund
 * @param userId The user ID associated with the refund
 * @param charge The Stripe charge object with refund information
 * @param tx The transaction client
 */
async function processSubscriptionRefund(
  userId: string,
  charge: Stripe.Charge,
  tx: Prisma.TransactionClient,
): Promise<void> {
  // Get all active subscriptions for this user/customer
  const subscriptions = await tx.subscription.findMany({
    where: {
      userId,
      stripeCustomerId: charge.customer as string,
    },
  })

  if (subscriptions.length === 0) {
    console.log(`No subscriptions found for user ${userId} with customer ${charge.customer}`)
    return
  }

  // Log what we found
  console.log(`Found ${subscriptions.length} subscriptions to update for refund`)

  // Update each subscription based on the refund
  for (const subscription of subscriptions) {
    // For lifetime or one-time purchases, handle refunds by updating status
    if (subscription.transactionType === TransactionType.LIFETIME) {
      // If fully refunded, mark the purchase as canceled
      if (charge.refunded) {
        await tx.subscription.update({
          where: { id: subscription.id },
          data: {
            status: SubscriptionStatus.CANCELED,
            updatedAt: new Date(),
            metadata: {
              ...((subscription.metadata as Record<string, unknown>) || {}),
              refundedAt: new Date().toISOString(),
              refundAmount: charge.amount_refunded > 0 ? charge.amount_refunded.toString() : null,
              refundId: charge.refunds?.data?.[0]?.id || null,
            },
          },
        })
        console.log(
          `Marked ${subscription.transactionType} subscription ${subscription.id} as canceled due to full refund`,
        )
      }
      // If partially refunded, update the metadata
      else if (charge.amount_refunded > 0) {
        await tx.subscription.update({
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
        console.log(
          `Updated ${subscription.transactionType} subscription ${subscription.id} metadata for partial refund`,
        )
      }
    }
    // For crypto payments, we need to manually cancel them since Stripe won't handle it through subscription webhooks
    else if (
      (subscription.metadata as Record<string, unknown>)?.isCryptoPayment === 'true' &&
      charge.refunded
    ) {
      await tx.subscription.update({
        where: { id: subscription.id },
        data: {
          status: SubscriptionStatus.CANCELED,
          updatedAt: new Date(),
          metadata: {
            ...((subscription.metadata as Record<string, unknown>) || {}),
            refundedAt: new Date().toISOString(),
            refundAmount: charge.amount_refunded > 0 ? charge.amount_refunded.toString() : null,
            refundId: charge.refunds?.data?.[0]?.id || null,
            fullyRefunded: 'true',
          },
        },
      })
      console.log(`Manually canceled crypto subscription ${subscription.id} due to refund`)
    }
    // For recurring subscriptions, just record the refund in metadata
    // The actual subscription status changes will come from Stripe subscription webhooks
    else if (subscription.status !== SubscriptionStatus.CANCELED) {
      await tx.subscription.update({
        where: { id: subscription.id },
        data: {
          updatedAt: new Date(),
          metadata: {
            ...((subscription.metadata as Record<string, unknown>) || {}),
            refundRecorded: new Date().toISOString(),
            refundAmount: charge.amount_refunded > 0 ? charge.amount_refunded.toString() : null,
            refundId: charge.refunds?.data?.[0]?.id || null,
            fullyRefunded: charge.refunded ? 'true' : 'false',
          },
        },
      })
      console.log(`Updated recurring subscription ${subscription.id} metadata for refund`)
    }
  }
}
