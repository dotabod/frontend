import type { Prisma } from '@prisma/client'
import { withErrorHandling } from '../utils/error-handling'
import type Stripe from 'stripe'
import { createLifetimePurchase } from './checkout-events'
import { SubscriptionStatus } from '@prisma/client'
import { stripe } from '@/lib/stripe-server'

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
                  updatedAt: new Date(),
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
                  updatedAt: new Date(),
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

  // Handle cases where metadata is missing but we have a payment intent
  if (charge.payment_intent) {
    console.log(`No userId in metadata, but found payment_intent ${charge.payment_intent}`)
    return (
      (await withErrorHandling(
        async () => {
          // Try to determine if this was a gift payment and handle accordingly
          if (await isGiftPayment(charge.payment_intent as string)) {
            await handleGiftCreditRefund(charge, tx)
          }
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
