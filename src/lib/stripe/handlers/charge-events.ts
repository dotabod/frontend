import type { Prisma } from '@prisma/client'
import { SubscriptionStatus } from '@prisma/client'
import type Stripe from 'stripe'

import { stripe } from '@/lib/stripe-server'

import type { RefundDependencies, RefundedCharge } from '../services/refund-service'
import { applyChargeRefund } from '../services/refund-service'
import { findInvoiceSubscriptionId } from '../utils/billing-facts'
import { withErrorHandling } from '../utils/error-handling'
import {
  createLifetimePurchase,
  findExistingCryptoSubscription,
  isLifetimePrice,
} from '../utils/subscription-utils'

export const handleChargeSucceeded = async function handleChargeSucceeded(
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
  if (!userId) {
    console.log(`Skipping charge.succeeded ${charge.id}: missing userId metadata`)
    return true
  }

  return (
    (await withErrorHandling(
      async () => {
        // Check if this is a crypto payment
        const isCryptoPayment = charge.payment_method_details?.type === 'crypto'

        if (isCryptoPayment && charge.payment_intent) {
          console.log(`Processing crypto payment for charge ${charge.id}`)

          // For crypto payments, we need to check if this is a recurring subscription payment
          // By looking up the checkout session that initiated this payment
          const sessions = await stripe.checkout.sessions.list({
            limit: 1,
            payment_intent: charge.payment_intent as string,
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
                    await createLifetimePurchase(userId, charge.customer as string, priceId, tx, {
                      chargeId: charge.id,
                      checkoutSessionId: session.id,
                    })
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
        // By checking the associated checkout session and price ID
        if (charge.payment_intent) {
          const sessions = await stripe.checkout.sessions.list({
            limit: 1,
            payment_intent: charge.payment_intent as string,
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
              await createLifetimePurchase(userId, charge.customer as string, priceId, tx, {
                chargeId: charge.id,
                checkoutSessionId: session.id,
              })
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

export const handleChargeRefunded = async function handleChargeRefunded(
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
    const piId =
      typeof charge.payment_intent === 'string'
        ? charge.payment_intent
        : (charge.payment_intent?.id ?? 'null')
    console.log(`No userId in metadata, but found payment_intent ${piId}`)
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

          const piIdLookup =
            typeof charge.payment_intent === 'string'
              ? charge.payment_intent
              : (charge.payment_intent?.id ?? 'null')
          console.log(`Unable to find userId for payment intent ${piIdLookup}`)
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

const isGiftPayment = async function isGiftPayment(paymentIntentId: string): Promise<boolean> {
  try {
    const sessions = await stripe.checkout.sessions.list({
      limit: 1,
      payment_intent: paymentIntentId,
    })

    if (sessions.data.length === 0) {
      return false
    }

    return sessions.data[0].metadata?.isGift === 'true'
  } catch (error) {
    console.error(`Error checking if payment intent ${paymentIntentId} is a gift:`, error)
    return false
  }
}

const handleGiftCreditRefund = async function handleGiftCreditRefund(
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
    limit: 1,
    payment_intent: paymentIntent,
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
    include: {
      subscription: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        where: {
          stripeCustomerId: { not: null },
        },
      },
    },
    where: { id: recipientUserId },
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
    include: {
      giftSubscription: true,
    },
    where: {
      OR: [
        { metadata: { equals: session.id, path: ['checkoutSessionId'] } },
        { metadata: { equals: paymentIntent, path: ['paymentIntentId'] } },
        { stripeSessionId: session.id },
      ],
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
        data: {
          metadata: {
            ...(giftTransaction.metadata as Record<string, unknown>),
            refundAmount: refundAmount.toString(),
            refundId: charge.refunds?.data?.[0]?.id ?? null,
            refundProportion: refundProportion.toString(),
            refundedAt: new Date().toISOString(),
          },
          updatedAt: new Date(),
        },
        where: { id: giftTransaction.id },
      })

      // For customer balance credits, create a positive balance transaction to offset the credit
      // This effectively "cancels out" the original negative credit amount
      const balanceTransaction = await stripe.customers.createBalanceTransaction(customerId, {
        // Positive amount to reverse the credit
        amount: refundAmount,
        currency: giftTransaction.currency,
        description: `Refund of gift credit from ${giftTransaction.giftSubscription?.senderName || 'Anonymous'}`,
        metadata: {
          isRefund: 'true',
          originalTransactionId: giftTransaction.id,
          refundId: charge.refunds?.data?.[0]?.id ?? null,
          refundedAt: new Date().toISOString(),
        },
      })

      console.log(
        `Successfully created balance transaction ${balanceTransaction.id} to reverse gift credit`,
      )

      // If this was a full refund, also mark the gift subscription record as canceled
      if (charge.refunded && giftTransaction.giftSubscriptionId) {
        await tx.subscription.updateMany({
          data: {
            metadata: {
              refundId: charge.refunds?.data?.[0]?.id ?? null,
              refundedAt: new Date().toISOString(),
            },
            status: SubscriptionStatus.CANCELED,
            updatedAt: new Date(),
          },
          where: {
            giftDetails: {
              id: giftTransaction.giftSubscriptionId,
            },
          },
        })

        console.log(
          `Marked gift subscription ${giftTransaction.giftSubscriptionId} as canceled due to refund`,
        )
      }
    } catch (error) {
      console.error('Error processing gift credit refund:', error)
      // Rethrow to be caught by withErrorHandling
      throw error
    }
  } else {
    console.log(`No gift transaction record found for refund of checkout ${session.id}`)

    // Create a basic reversal based on session metadata
    if (customerId && session.metadata?.giftType && session.metadata?.giftQuantity) {
      try {
        const { giftType } = session.metadata
        const giftQuantity = Math.trunc(Number(session.metadata.giftQuantity)) || 1

        // Calculate an approximate refund amount based on standard pricing
        const priceMap = {
          annual:
            Math.trunc(Number(process.env.ANNUAL_SUBSCRIPTION_PRICE_CENTS ?? '4800')) *
            giftQuantity,
          lifetime:
            Math.trunc(Number(process.env.LIFETIME_SUBSCRIPTION_PRICE_CENTS ?? '30000')) *
            giftQuantity,
          monthly:
            Math.trunc(Number(process.env.MONTHLY_SUBSCRIPTION_PRICE_CENTS ?? '500')) *
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
              isEstimated: 'true',
              isRefund: 'true',
              paymentIntentId: paymentIntent,
              refundId: charge.refunds?.data?.[0]?.id ?? null,
              refundedAt: new Date().toISOString(),
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

const getUserIdFromPaymentIntent = async function getUserIdFromPaymentIntent(
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
        orderBy: { createdAt: 'desc' },
        where: {
          stripeCustomerId: customerId,
        },
      })

      if (subscription?.userId) {
        return subscription.userId
      }
    }

    // If we still don't have a userId, try to find it from checkout sessions
    const sessions = await stripe.checkout.sessions.list({
      limit: 1,
      payment_intent: paymentIntentId,
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

const stripeIdOf = function stripeIdOf(reference: string | { id: string }): string {
  return reference instanceof Object ? reference.id : reference
}

const toRefundedCharge = function toRefundedCharge(charge: Stripe.Charge): RefundedCharge {
  return {
    amountRefunded: charge.amount_refunded,
    customerId: charge.customer instanceof Object ? charge.customer.id : charge.customer,
    id: charge.id,
    paymentIntentId:
      charge.payment_intent instanceof Object ? charge.payment_intent.id : charge.payment_intent,
    refundId: charge.refunds?.data.at(0)?.id ?? null,
    refunded: charge.refunded,
  }
}

const createRefundDependencies = function createRefundDependencies(
  tx: Prisma.TransactionClient,
): RefundDependencies {
  return {
    lookups: {
      findCheckoutSessionId: async (paymentIntentId) => {
        const sessions = await stripe.checkout.sessions.list({
          limit: 1,
          payment_intent: paymentIntentId,
        })
        return sessions.data.at(0)?.id ?? null
      },
      // The charge no longer links to its invoice in the pinned API version, so go through the
      // Invoice payment that settled the charge's payment intent.
      findInvoiceSubscriptionId: async (paymentIntentId) => {
        const payments = await stripe.invoicePayments.list({
          limit: 1,
          payment: { payment_intent: paymentIntentId, type: 'payment_intent' },
        })
        const reference = payments.data.at(0)?.invoice
        if (reference === undefined) {
          return null
        }

        const invoice = await stripe.invoices.retrieve(stripeIdOf(reference))
        return findInvoiceSubscriptionId(invoice)
      },
    },
    store: {
      findSubscriptions: async (userId, customerId) =>
        await tx.subscription.findMany({
          select: {
            id: true,
            metadata: true,
            status: true,
            stripeSubscriptionId: true,
            transactionType: true,
          },
          where: { stripeCustomerId: customerId, userId },
        }),
      updateSubscription: async (id, update) => {
        await tx.subscription.update({
          data: { ...update, updatedAt: new Date() },
          where: { id },
        })
      },
    },
  }
}

const processSubscriptionRefund = async function processSubscriptionRefund(
  userId: string,
  charge: Stripe.Charge,
  tx: Prisma.TransactionClient,
): Promise<void> {
  await applyChargeRefund(
    { charge: toRefundedCharge(charge), userId },
    createRefundDependencies(tx),
  )
}
