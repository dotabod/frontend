import { type Prisma, SubscriptionStatus, TransactionType } from '@prisma/client'
import { stripe } from '@/lib/stripe-server'
import { getSubscriptionTier } from '@/utils/subscription'
import { withErrorHandling } from '../utils/error-handling'
import type Stripe from 'stripe'
import { CustomerService } from './customer-service'
import { SubscriptionService } from './subscription-service'

/**
 * Service for managing gift subscription operations
 */
export class GiftService {
  private customerService: CustomerService
  private subscriptionService: SubscriptionService

  constructor(private tx: Prisma.TransactionClient) {
    this.customerService = new CustomerService(tx)
    this.subscriptionService = new SubscriptionService(tx)
  }

  /**
   * Processes a gift checkout session
   * @param session The Stripe checkout session
   * @returns True if the operation was successful, false otherwise
   */
  async processGiftCheckout(session: Stripe.Checkout.Session): Promise<boolean> {
    const recipientUserId = session.metadata?.recipientUserId
    if (!recipientUserId) return false

    return (
      (await withErrorHandling(
        async () => {
          const giftSenderName = session.metadata?.giftSenderName || 'Anonymous'
          const giftMessage = session.metadata?.giftMessage || ''
          const giftType = session.metadata?.giftDuration || 'monthly'

          // Get the initial quantity from metadata
          let giftQuantity = Number.parseInt(session.metadata?.giftQuantity || '1', 10)

          // For gift credits, get the actual quantity from the line items
          // in case the customer adjusted it during checkout
          try {
            // Retrieve the line items to get the final quantity
            const lineItems = await stripe.checkout.sessions.listLineItems(session.id, { limit: 1 })
            if (lineItems.data.length > 0) {
              const actualQuantity = lineItems.data[0].quantity || 1
              if (actualQuantity !== giftQuantity) {
                console.log(`Customer adjusted quantity from ${giftQuantity} to ${actualQuantity}`)
                giftQuantity = actualQuantity
              }
            }
          } catch (error) {
            console.error('Error retrieving line items:', error)
            // Continue with the quantity from metadata as fallback
          }

          // Get the payment amount from the checkout session
          const paymentAmount = session.amount_total || 0
          const currency = session.currency || 'usd'

          // Find the recipient user
          const recipientUser = await this.tx.user.findUnique({
            where: { id: recipientUserId },
            select: {
              id: true,
              email: true,
              name: true,
              image: true,
              locale: true,
            },
          })

          if (!recipientUser) {
            console.error(`Recipient user not found: ${recipientUserId}`)
            return false
          }

          // Ensure the recipient has a Stripe customer ID
          const recipientCustomerId = await this.customerService.ensureCustomer(recipientUser)

          // Calculate the new expiration date
          const currentPeriodEnd = await this.calculateGiftExpiration(
            recipientUser,
            giftType,
            giftQuantity,
          )

          // Create or update the subscription record
          const subscription = await this.createOrUpdateGiftSubscription(
            recipientUserId,
            recipientCustomerId,
            session,
            giftType,
            giftQuantity,
            currentPeriodEnd,
          )

          // Create the gift subscription details
          const giftSubscription = await this.tx.giftSubscription.create({
            data: {
              subscriptionId: subscription.id,
              senderName: giftSenderName,
              giftMessage: giftMessage,
              giftType: giftType,
              giftQuantity: giftQuantity,
            },
          })

          // Create a notification for the recipient
          await this.tx.notification.create({
            data: {
              userId: recipientUserId,
              type: 'GIFT_SUBSCRIPTION',
              giftSubscriptionId: giftSubscription.id,
            },
          })

          // Create a gift transaction for auditing
          await this.tx.giftTransaction.create({
            data: {
              giftSubscriptionId: giftSubscription.id,
              recipientId: recipientUserId,
              gifterId: session.metadata?.gifterId || null,
              giftType,
              giftQuantity,
              amount: paymentAmount || 0,
              currency: session.currency || 'usd',
              stripeSessionId: session.id,
              metadata: {
                giftSenderName,
                giftMessage,
                giftSenderEmail: session.metadata?.giftSenderEmail || '',
                checkoutSessionId: session.id,
              },
            },
          })

          // Handle regular subscription if the user has one
          await this.handleRegularSubscriptionForGiftRecipient(
            recipientUserId,
            currentPeriodEnd,
            session.id,
          )

          return true
        },
        `processGiftCheckout(${session.id})`,
        session.metadata?.recipientUserId,
      )) !== null
    )
  }

  /**
   * Calculates the expiration date for a gift subscription
   * @param recipientUser The recipient user
   * @param giftType The gift type (monthly, annual, lifetime)
   * @param giftQuantity The gift quantity
   * @returns The calculated expiration date
   */
  private async calculateGiftExpiration(
    recipientUser: {
      id: string
    },
    giftType: string,
    giftQuantity: number,
  ): Promise<Date> {
    if (giftType === 'lifetime') {
      // For lifetime gifts, set a far future date
      return new Date('2099-12-31T23:59:59.999Z')
    }

    // For other gift types, calculate based on existing subscription
    const now = new Date()

    // Check if we're in the grace period
    const { isInGracePeriod, GRACE_PERIOD_END } = await import('@/utils/subscription')

    // Find all existing gift subscriptions for the recipient
    const existingGiftSubscriptions = await this.tx.subscription.findMany({
      where: {
        userId: recipientUser.id,
        status: { in: ['ACTIVE', 'TRIALING'] },
        isGift: true,
      },
      orderBy: {
        currentPeriodEnd: 'desc',
      },
      select: {
        id: true,
        currentPeriodEnd: true,
        metadata: true,
      },
    })

    console.log(
      `Found ${existingGiftSubscriptions.length} existing gift subscriptions for user ${recipientUser.id}`,
    )

    // Determine the starting point for the gift duration
    // If in grace period, start from the grace period end to avoid overlap
    let startDate: Date

    if (isInGracePeriod()) {
      // Start from the grace period end
      startDate = new Date(GRACE_PERIOD_END)
    } else {
      // Find the latest expiration date among existing gift subscriptions
      let latestExpiration: Date | null = null
      for (const gift of existingGiftSubscriptions) {
        if (
          gift.currentPeriodEnd &&
          (!latestExpiration || gift.currentPeriodEnd > latestExpiration)
        ) {
          latestExpiration = new Date(gift.currentPeriodEnd)
        }
      }

      // Start from the later of now or existing gift subscription end date
      startDate = latestExpiration && latestExpiration > now ? new Date(latestExpiration) : now
    }

    console.log(`Starting gift calculation from date: ${startDate.toISOString()}`)

    // Import the aggregateGiftDuration function from the gift-subscription module
    const { aggregateGiftDuration } = await import('@/lib/gift-subscription')

    // Calculate the new expiration date
    const expirationDate = aggregateGiftDuration(giftType, giftQuantity, null, startDate)
    console.log(
      `Calculated gift expiration date: ${expirationDate.toISOString()} for ${giftQuantity} ${giftType} periods`,
    )

    return expirationDate
  }

  /**
   * Creates or updates a gift subscription
   * @param userId The recipient user ID
   * @param customerId The Stripe customer ID
   * @param session The Stripe checkout session
   * @param giftType The gift type
   * @param giftQuantity The gift quantity
   * @param currentPeriodEnd The expiration date
   * @returns The created or updated subscription
   */
  private async createOrUpdateGiftSubscription(
    userId: string,
    customerId: string,
    session: Stripe.Checkout.Session,
    giftType: string,
    giftQuantity: number,
    currentPeriodEnd: Date,
  ): Promise<{ id: string }> {
    // Always create a new gift subscription record
    return await this.tx.subscription.create({
      data: {
        userId,
        status: SubscriptionStatus.ACTIVE,
        tier: getSubscriptionTier(null, SubscriptionStatus.ACTIVE),
        stripePriceId: session.metadata?.priceId || '',
        stripeCustomerId: customerId,
        transactionType:
          giftType === 'lifetime' ? TransactionType.LIFETIME : TransactionType.RECURRING,
        currentPeriodEnd,
        cancelAtPeriodEnd: true,
        stripeSubscriptionId: null,
        isGift: true,
        metadata: {
          giftType,
          giftQuantity: giftQuantity.toString(),
          createdAt: new Date().toISOString(),
          checkoutSessionId: session.id,
        },
      },
      select: {
        id: true,
      },
    })
  }

  /**
   * Handles a regular subscription for a gift recipient
   * @param userId The recipient user ID
   * @param giftExpirationDate The gift expiration date
   * @param sessionId The Stripe checkout session ID
   * @returns True if the operation was successful, false otherwise
   */
  private async handleRegularSubscriptionForGiftRecipient(
    userId: string,
    giftExpirationDate: Date,
    sessionId: string,
  ): Promise<boolean> {
    // If the user has an active regular subscription (not a gift), adjust its renewal date
    // to start after the gift subscription expires
    const regularSubscription = await this.tx.subscription.findFirst({
      where: {
        userId,
        status: { in: ['ACTIVE', 'TRIALING'] },
        isGift: false,
        stripeSubscriptionId: { not: null },
      },
    })

    // Ensure we have a valid subscription ID
    if (!regularSubscription || !regularSubscription.stripeSubscriptionId) {
      return false
    }

    // Find all active gift subscriptions for this user to determine the latest expiration date
    const allGiftSubscriptions = await this.tx.subscription.findMany({
      where: {
        userId,
        status: { in: ['ACTIVE', 'TRIALING'] },
        isGift: true,
      },
      select: {
        id: true,
        currentPeriodEnd: true,
        metadata: true,
      },
    })

    // Import the aggregateGiftDuration function
    const { aggregateGiftDuration } = await import('@/lib/gift-subscription')

    // Start with the grace period end date or now as the base date
    const { isInGracePeriod, GRACE_PERIOD_END } = await import('@/utils/subscription')
    const baseDate = isInGracePeriod() ? new Date(GRACE_PERIOD_END) : new Date()

    // Properly accumulate all gift durations
    let finalExpirationDate = baseDate

    // First, find the latest existing gift expiration date to use as our starting point
    for (const gift of allGiftSubscriptions) {
      if (gift.currentPeriodEnd && gift.currentPeriodEnd > finalExpirationDate) {
        finalExpirationDate = new Date(gift.currentPeriodEnd)
      }
    }

    console.log(`Initial expiration date: ${finalExpirationDate.toISOString()}`)
    console.log(`Total gift subscriptions: ${allGiftSubscriptions.length}`)

    return (
      (await withErrorHandling(
        async () => {
          const stripeSubscriptionId = regularSubscription.stripeSubscriptionId as string

          // Only update if the gift extends beyond the current period and currentPeriodEnd is not null
          if (
            regularSubscription.currentPeriodEnd &&
            finalExpirationDate > regularSubscription.currentPeriodEnd
          ) {
            // Use the helper function to pause the subscription
            await this.subscriptionService.pauseForGift(stripeSubscriptionId, finalExpirationDate, {
              originalRenewalDate: regularSubscription.currentPeriodEnd.toISOString(),
              giftCheckoutSessionId: sessionId,
              totalGiftSubscriptions: allGiftSubscriptions.length.toString(),
            })

            console.log(
              `Updated regular subscription ${regularSubscription.id} to resume after all gifts expire on ${finalExpirationDate.toISOString()}`,
            )
            return true
          }

          // Even if the gift doesn't extend beyond the current period, we should still pause billing
          // until after the grace period if we're in the grace period
          if (isInGracePeriod() && finalExpirationDate > new Date(GRACE_PERIOD_END)) {
            // Use the helper function to pause the subscription
            await this.subscriptionService.pauseForGift(stripeSubscriptionId, finalExpirationDate, {
              pausedDuringGracePeriod: 'true',
              giftCheckoutSessionId: sessionId,
              totalGiftSubscriptions: allGiftSubscriptions.length.toString(),
            })

            console.log(
              `Paused regular subscription ${regularSubscription.id} during grace period until all gifts expire on ${finalExpirationDate.toISOString()}`,
            )
            return true
          }

          return false
        },
        `handleRegularSubscriptionForGiftRecipient(${userId})`,
        userId,
      )) !== null
    )
  }
}
