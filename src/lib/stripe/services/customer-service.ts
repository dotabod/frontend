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
          orderBy: { createdAt: 'desc' }, // Use the most recent subscription
          select: { stripeCustomerId: true },
          where: { userId: user.id },
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

        // Create or find customer if needed (email is optional)
        if (!customerId) {
          if (user.email) {
            const existingCustomers = await stripe.customers.list({
              email: user.email,
              limit: 1,
            })

            if (existingCustomers.data.length > 0) {
              customerId = existingCustomers.data[0].id
            }
          }

          if (!customerId) {
            const newCustomer = await this.createStripeCustomer(user)
            customerId = newCustomer.id
          }

          if (!subscription?.stripeCustomerId) {
            // Update existing subscriptions with no customer ID
            await this.tx.subscription.updateMany({
              data: { stripeCustomerId: customerId, updatedAt: new Date() },
              where: { stripeCustomerId: null, userId: user.id },
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
        email: user.email ?? '',
        image: user.image ?? '',
        locale: user.locale ?? '',
        name: user.name ?? '',
        userId: user.id,
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
    debugLog('Found userId in metadata', { customerId: customer.id, userId })

    const result = await withErrorHandling(
      async () => {
        debugLog('Inside withErrorHandling for handleCustomerDeleted', {
          customerId: customer.id,
          userId,
        })
        // Delete subscriptions associated with this customer
        debugLog('Deleting subscriptions for customer', { customerId: customer.id, userId })
        const deleteResult = await this.tx.subscription.deleteMany({
          where: {
            OR: [{ userId }, { stripeCustomerId: customer.id }],
          },
        })
        debugLog('Deleted subscriptions', {
          count: deleteResult.count,
          customerId: customer.id,
          userId,
        })

        // Check if there are any remaining active subscriptions (e.g., gift subscriptions)
        // That aren't associated with this customer
        debugLog('Checking for remaining active subscriptions', {
          customerId: customer.id,
          userId,
        })
        const remainingSubscriptions = await this.tx.subscription.findMany({
          where: {
            status: { in: ['ACTIVE', 'TRIALING'] },
            stripeCustomerId: { not: customer.id },
            userId,
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

    debugLog('Result from withErrorHandling', { customerId: customer.id, result, userId })
    const finalResult = result !== null
    debugLog('Exiting CustomerService.handleCustomerDeleted', {
      customerId: customer.id,
      finalResult,
      userId,
    })
    return finalResult
  }
}
