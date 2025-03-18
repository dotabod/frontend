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
   * Processes a gift checkout session using customer balance credits
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

          // Calculate credit amount based on the gift parameters
          const creditAmount = await this.calculateCreditAmount(giftType, giftQuantity)

          // Add the credit to the customer's balance
          await this.addCustomerBalanceCredit(recipientCustomerId, creditAmount, {
            giftType,
            giftQuantity: giftQuantity.toString(),
            giftSenderName,
            giftMessage,
            giftSenderEmail: session.metadata?.giftSenderEmail || '',
            checkoutSessionId: session.id,
            gifterId: session.metadata?.gifterId || '',
          })

          // Create a gift transaction record for auditing purposes
          await this.tx.giftTransaction.create({
            data: {
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
                creditAmount: creditAmount.toString(),
              },
              // Create a relation to a placeholder gift subscription
              giftSubscription: {
                create: {
                  senderName: giftSenderName,
                  giftMessage,
                  giftType,
                  giftQuantity,
                  // Create a placeholder subscription for the gift
                  subscription: {
                    create: {
                      userId: recipientUserId,
                      stripeCustomerId: recipientCustomerId,
                      status: SubscriptionStatus.ACTIVE,
                      tier: getSubscriptionTier(null, SubscriptionStatus.ACTIVE),
                      transactionType:
                        giftType === 'lifetime'
                          ? TransactionType.LIFETIME
                          : TransactionType.RECURRING,
                      isGift: true,
                      metadata: {
                        giftType,
                        giftQuantity: giftQuantity.toString(),
                        creditAmount: creditAmount.toString(),
                        checkoutSessionId: session.id,
                      },
                    },
                  },
                },
              },
            },
          })

          // Create a notification for the recipient
          await this.tx.notification.create({
            data: {
              userId: recipientUserId,
              type: 'GIFT_SUBSCRIPTION',
              isRead: false,
              // Connect to the gift subscription we created above - we'd need to fetch it first
              // For simplicity, we'll just create a notification without the relation
            },
          })

          return true
        },
        `processGiftCheckout(${session.id})`,
        session.metadata?.recipientUserId,
      )) !== null
    )
  }

  /**
   * Calculates the amount of credit to give based on gift type and quantity
   * @param giftType The type of gift (monthly, annual, lifetime)
   * @param giftQuantity The quantity of the gift
   * @returns The credit amount in cents (negative value to reduce what customer owes)
   */
  private async calculateCreditAmount(giftType: string, giftQuantity: number): Promise<number> {
    // Get the monthly price from environment variables or configuration
    const monthlyPrice = Number.parseInt(process.env.MONTHLY_SUBSCRIPTION_PRICE_CENTS || '500', 10)
    const annualPrice = Number.parseInt(process.env.ANNUAL_SUBSCRIPTION_PRICE_CENTS || '4800', 10)
    const lifetimePrice = Number.parseInt(
      process.env.LIFETIME_SUBSCRIPTION_PRICE_CENTS || '30000',
      10,
    )

    let creditAmount = 0

    switch (giftType) {
      case 'monthly':
        creditAmount = monthlyPrice * giftQuantity
        break
      case 'annual':
        creditAmount = annualPrice * giftQuantity
        break
      case 'lifetime':
        creditAmount = lifetimePrice
        break
      default:
        creditAmount = monthlyPrice * giftQuantity
    }

    // Return negative amount (credit to reduce what customer owes)
    return -creditAmount
  }

  /**
   * Adds credit to a customer's balance
   * @param customerId The Stripe customer ID
   * @param amount The amount to credit (negative value for credit, positive for debit)
   * @param metadata Additional metadata to store with the transaction
   * @returns The created customer balance transaction
   */
  private async addCustomerBalanceCredit(
    customerId: string,
    amount: number,
    metadata: Record<string, string>,
  ): Promise<Stripe.CustomerBalanceTransaction> {
    try {
      const balanceTransaction = await stripe.customers.createBalanceTransaction(customerId, {
        amount, // negative amount to credit the customer
        currency: 'usd',
        description: `Gift subscription credit: ${metadata.giftType} x ${metadata.giftQuantity}`,
        metadata,
      })

      console.log(`Added ${amount} cents credit to customer ${customerId}`, balanceTransaction)
      return balanceTransaction
    } catch (error) {
      console.error(`Failed to add credit to customer ${customerId}:`, error)
      throw error
    }
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

    // Check if the user has an active trial subscription
    const trialSubscription = await this.tx.subscription.findFirst({
      where: {
        userId: recipientUser.id,
        status: 'TRIALING',
        isGift: false,
        stripeSubscriptionId: { not: null },
      },
    })

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
    let startDate: Date

    if (trialSubscription?.stripeSubscriptionId) {
      // If user has a trial subscription, retrieve it from Stripe to get the trial end date
      const stripeSubscription = await stripe.subscriptions.retrieve(
        trialSubscription.stripeSubscriptionId,
      )

      if (stripeSubscription.status === 'trialing' && stripeSubscription.trial_end) {
        // Use the trial end date as the start date
        startDate = new Date(stripeSubscription.trial_end * 1000)
        console.log(
          `User has a trial subscription. Using trial end date as start: ${startDate.toISOString()}`,
        )
      } else if (isInGracePeriod()) {
        // If in grace period, use grace period end date
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

    // Get the current subscription from Stripe to check if it's in trial period
    const stripeSubscription = await stripe.subscriptions.retrieve(
      regularSubscription.stripeSubscriptionId,
    )

    // Determine the base date for gift calculation
    const { isInGracePeriod, GRACE_PERIOD_END } = await import('@/utils/subscription')

    let baseDate: Date

    // If subscription is in trial period, use the trial end date as the base date
    if (stripeSubscription.status === 'trialing' && stripeSubscription.trial_end) {
      baseDate = new Date(stripeSubscription.trial_end * 1000)
      console.log(
        `Subscription is in trial period. Using trial end date as base: ${baseDate.toISOString()}`,
      )
    } else if (isInGracePeriod()) {
      // If in grace period, use grace period end date
      baseDate = new Date(GRACE_PERIOD_END)
    } else {
      // Otherwise use current date
      baseDate = new Date()
    }

    // Calculate the final expiration date by aggregating all gift durations
    let finalExpirationDate = baseDate

    // Process each gift subscription to build up the total duration
    for (const gift of allGiftSubscriptions) {
      if (gift.metadata) {
        const metadata = gift.metadata as Record<string, unknown>
        const giftType = (metadata.giftType as string) || 'monthly'
        const giftQuantity = Number.parseInt((metadata.giftQuantity as string) || '1', 10)

        // Use aggregateGiftDuration to add this gift's duration to our running total
        finalExpirationDate = aggregateGiftDuration(giftType, giftQuantity, finalExpirationDate)

        console.log(
          `Added gift: ${giftType} x ${giftQuantity}, new expiration: ${finalExpirationDate.toISOString()}`,
        )
      }
    }

    console.log(`Final calculated expiration date: ${finalExpirationDate.toISOString()}`)
    console.log(`Total gift subscriptions: ${allGiftSubscriptions.length}`)

    // Update all gift subscription records with the final expiration date
    // This ensures that all gift subscriptions have the same end date
    if (allGiftSubscriptions.length > 0) {
      console.log(
        `Updating ${allGiftSubscriptions.length} gift subscriptions with final expiration date: ${finalExpirationDate.toISOString()}`,
      )

      // Update each gift subscription with the final expiration date
      for (const gift of allGiftSubscriptions) {
        await this.tx.subscription.update({
          where: { id: gift.id },
          data: {
            currentPeriodEnd: finalExpirationDate,
            metadata: {
              ...((gift.metadata as Record<string, unknown>) || {}),
              finalCalculatedExpiration: finalExpirationDate.toISOString(),
              totalGiftSubscriptions: allGiftSubscriptions.length.toString(),
              lastUpdated: new Date().toISOString(),
            },
          },
        })
        console.log(
          `Updated gift subscription ${gift.id} with final expiration date: ${finalExpirationDate.toISOString()}`,
        )
      }
    }

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
