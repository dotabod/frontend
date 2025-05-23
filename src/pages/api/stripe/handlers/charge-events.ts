import { stripe } from '@/lib/stripe-server'
import type { Prisma } from '@prisma/client'
import type Stripe from 'stripe'
import { GiftService } from '../services/gift-service'
import { SubscriptionService } from '../services/subscription-service'
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
          const giftService = new GiftService(tx)
          await giftService.processGiftRefund(charge)
          return true
        },
        `GiftService.processGiftRefund(${charge.id})`,
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
          const subscriptionService = new SubscriptionService(tx)
          await subscriptionService.processRefund(userId, charge)
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
            const giftService = new GiftService(tx)
            await giftService.processGiftRefund(charge)
            return true
          }

          // If not a gift payment, try to find the userId from the payment intent
          const userId = await getUserIdFromPaymentIntent(charge.payment_intent as string, tx)
          if (userId) {
            console.log(`Found userId ${userId} from payment intent lookup`)
            const subscriptionService = new SubscriptionService(tx)
            await subscriptionService.processRefund(userId, charge)
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
