import type { Prisma } from '@prisma/client'
import type Stripe from 'stripe'
import { stripe } from '@/lib/stripe-server'
import { debugLog } from '../utils/debugLog'
import { withErrorHandling } from '../utils/error-handling'

/**
 * Service for managing customer-related operations
 */
export class CustomerService {
  constructor(private tx: Prisma.TransactionClient) {}

  /**
   * Ensures a customer exists for a user, either by finding an existing one or creating a new one
   * @param user The user object
   * @returns The Stripe customer ID
   */
  async ensureCustomer(user: {
    id: string
    email?: string | null
    name?: string | null
    image?: string | null
    locale?: string | null
  }): Promise<string> {
    const result = await withErrorHandling(
      async () => {
        // Look for any existing subscription to get a customer ID
        const subscription = await this.tx.subscription.findFirst({
          where: { userId: user.id },
          select: { stripeCustomerId: true },
          orderBy: { createdAt: 'desc' }, // Use the most recent subscription
        })

        let customerId = subscription?.stripeCustomerId

        // Verify existing customer
        if (customerId) {
          try {
            await stripe.customers.retrieve(customerId)
          } catch (error) {
            console.error('Invalid customer ID found:', error)
            customerId = null
          }
        }

        // Create or find customer if needed
        if (!customerId && user.email) {
          const existingCustomers = await stripe.customers.list({
            email: user.email,
            limit: 1,
          })

          if (existingCustomers.data.length > 0) {
            customerId = existingCustomers.data[0].id
          } else {
            const newCustomer = await this.createStripeCustomer(user)
            customerId = newCustomer.id
          }

          if (!subscription?.stripeCustomerId) {
            // Update existing subscriptions with no customer ID
            await this.tx.subscription.updateMany({
              where: { userId: user.id, stripeCustomerId: null },
              data: { stripeCustomerId: customerId, updatedAt: new Date() },
            })
          }
        }

        if (!customerId) {
          throw new Error('Unable to establish customer ID')
        }

        return customerId
      },
      `ensureCustomer(${user.id})`,
      user.id,
    )

    if (result === null) {
      throw new Error(`Failed to ensure customer for user ${user.id}`)
    }

    return result
  }

  /**
   * Creates a new Stripe customer for a user
   * @param user The user object
   * @returns The created Stripe customer
   */
  private async createStripeCustomer(user: {
    id: string
    email?: string | null
    name?: string | null
    image?: string | null
    locale?: string | null
  }): Promise<Stripe.Customer> {
    return await stripe.customers.create({
      email: user.email ?? undefined,
      metadata: {
        userId: user.id,
        email: user.email ?? '',
        name: user.name ?? '',
        image: user.image ?? '',
        locale: user.locale ?? '',
      },
    })
  }

  /**
   * Handles a customer deletion event from Stripe
   * @param customer The Stripe customer object
   * @returns True if the operation was successful, false otherwise
   */
  async handleCustomerDeleted(customer: Stripe.Customer): Promise<boolean> {
    debugLog('Entering CustomerService.handleCustomerDeleted', { customerId: customer.id })
    const userId = customer.metadata?.userId
    if (!userId) {
      debugLog('No userId found in customer metadata, exiting.', { customerId: customer.id })
      return false
    }
    debugLog('Found userId in metadata', { userId, customerId: customer.id })

    const result = await withErrorHandling(
      async () => {
        debugLog('Inside withErrorHandling for handleCustomerDeleted', {
          userId,
          customerId: customer.id,
        })
        // Delete subscriptions associated with this customer
        debugLog('Deleting subscriptions for customer', { userId, customerId: customer.id })
        const deleteResult = await this.tx.subscription.deleteMany({
          where: {
            OR: [{ userId }, { stripeCustomerId: customer.id }],
          },
        })
        debugLog('Deleted subscriptions', {
          count: deleteResult.count,
          userId,
          customerId: customer.id,
        })

        // Check if there are any remaining active subscriptions (e.g., gift subscriptions)
        // that aren't associated with this customer
        debugLog('Checking for remaining active subscriptions', { userId, customerId: customer.id })
        const remainingSubscriptions = await this.tx.subscription.findMany({
          where: {
            userId,
            status: { in: ['ACTIVE', 'TRIALING'] },
            stripeCustomerId: { not: customer.id },
          },
        })

        debugLog(
          `User ${userId} has ${remainingSubscriptions.length} remaining active subscriptions after customer deletion`,
        )

        return true
      },
      `handleCustomerDeleted(${customer.id})`,
      userId,
    )

    debugLog('Result from withErrorHandling', { result, userId, customerId: customer.id })
    const finalResult = result !== null
    debugLog('Exiting CustomerService.handleCustomerDeleted', {
      finalResult,
      userId,
      customerId: customer.id,
    })
    return finalResult
  }
}
