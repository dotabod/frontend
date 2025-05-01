import { type Prisma, SubscriptionStatus, TransactionType } from '@prisma/client'
import { stripe } from '@/lib/stripe-server'
import { getSubscriptionTier } from '@/utils/subscription'
import { withErrorHandling } from '../utils/error-handling'
import type Stripe from 'stripe'
import { CustomerService } from './customer-service'

/**
 * Service for managing gift subscription operations using Stripe customer balance credits
 */
export class GiftService {
  private customerService: CustomerService

  constructor(private tx: Prisma.TransactionClient) {
    this.customerService = new CustomerService(tx)
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
            recipientId: recipientUserId,
          })

          // Create a gift transaction record for auditing purposes
          const giftTransaction = await this.tx.giftTransaction.create({
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
              giftSubscriptionId: giftTransaction.giftSubscriptionId,
            },
          })

          // Check if we should automatically apply the credits
          // We do this by checking if the user has an active subscription
          const existingSubscription = await this.tx.subscription.findFirst({
            where: {
              userId: recipientUserId,
              status: { in: ['ACTIVE', 'TRIALING'] },
              isGift: false,
            },
          })

          // If the user doesn't have an active subscription, attempt to apply the credits automatically
          // We'll do this after the transaction completes to avoid complications
          if (!existingSubscription) {
            // Schedule automatic application of credits for after this transaction completes
            setTimeout(async () => {
              try {
                // Call the apply-gift-credit API endpoint
                const autoApplyResponse = await fetch(`${process.env.NEXTAUTH_URL || 'https://dotabod.com'}/api/stripe/apply-gift-credit`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    userId: recipientUserId,
                  }),
                })

                const result = await autoApplyResponse.json()
                console.log('Auto-applied gift credits result:', result)
              } catch (autoApplyError) {
                console.error('Failed to auto-apply gift credits:', autoApplyError)
                // Don't fail the overall process if auto-apply fails
              }
            }, 500) // Small delay to ensure transaction completes
          }

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
    const monthlyPrice = 600
    const annualPrice = 5700
    const lifetimePrice = 9900

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
}
