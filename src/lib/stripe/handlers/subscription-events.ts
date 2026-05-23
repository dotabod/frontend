import { type Prisma, SubscriptionStatus, TransactionType } from '@prisma/client'
import type Stripe from 'stripe'
import { stripe } from '@/lib/stripe-server'
import { getSubscriptionTier } from '@/utils/subscription'
import { debugLog } from '../utils/debugLog'
import { withErrorHandling } from '../utils/error-handling'

/**
 * Handles a subscription event from Stripe
 * @param subscription The Stripe subscription
 * @param tx The transaction client
 * @returns True if the operation was successful, false otherwise
 */
export async function handleSubscriptionEvent(
  subscription: Stripe.Subscription,
  tx: Prisma.TransactionClient,
): Promise<boolean> {
  debugLog('Entering handleSubscriptionEvent', {
    status: subscription.status,
    subscriptionId: subscription.id,
  })
  const customerId = subscription.customer as string
  let customer: Stripe.Customer | Stripe.DeletedCustomer | null = null
  try {
    customer = await stripe.customers.retrieve(customerId)
    debugLog('Retrieved customer', { customerId })
  } catch (error) {
    console.error(`Failed to retrieve customer ${customerId}:`, error)
    debugLog('Failed to retrieve customer', { customerId, error })
    return false // Cannot proceed without customer
  }

  if (!customer || customer.deleted) {
    debugLog('Customer not found or deleted, exiting handleSubscriptionEvent', {
      customerId,
      deleted: customer?.deleted,
    })
    return false
  }

  const { userId } = customer.metadata
  if (!userId) {
    debugLog('No userId found in customer metadata, exiting handleSubscriptionEvent', {
      customerId,
    })
    return false
  }
  debugLog('Found userId in metadata', { customerId, userId })

  const result = await withErrorHandling(
    async () => {
      debugLog('Inside withErrorHandling for handleSubscriptionEvent', {
        subscriptionId: subscription.id,
        userId,
      })
      // Get the price ID from the subscription
      const priceId = subscription.items.data[0]?.price.id ?? null
      debugLog('Extracted priceId', { priceId, subscriptionId: subscription.id })
      const mappedStatus = mapStripeStatus(subscription.status)
      debugLog('Mapped Stripe status', { mappedStatus, stripeStatus: subscription.status })

      // Find or create the subscription record
      debugLog('Finding existing subscription record', { stripeSubscriptionId: subscription.id })
      const existingSubscription = await tx.subscription.findFirst({
        where: {
          stripeSubscriptionId: subscription.id,
        },
      })

      if (existingSubscription) {
        debugLog('Found existing subscription, updating...', {
          id: existingSubscription.id,
          stripeSubscriptionId: subscription.id,
        })
        // Update the existing subscription
        await tx.subscription.update({
          data: {
            cancelAtPeriodEnd: subscription.cancel_at_period_end,
            currentPeriodEnd: new Date(subscription.items.data[0]?.current_period_end * 1000),
            metadata: {
              ...subscription.metadata,
              // Store collection method to know this is a crypto invoice-based subscription
              collectionMethod: subscription.collection_method,
              isCryptoPayment: subscription.metadata?.isCryptoPayment || 'false',
            },
            status: mappedStatus,
            stripePriceId: priceId || '',
            tier: getSubscriptionTier(priceId, mappedStatus),
            updatedAt: new Date(),
          },
          where: {
            id: existingSubscription.id,
          },
        })

        debugLog(`Updated subscription ${existingSubscription.id} status to ${mappedStatus}`)
      } else {
        debugLog('No existing subscription found, creating new record...', {
          stripeSubscriptionId: subscription.id,
          userId,
        })
        // Create a new subscription record
        const newSubscription = await tx.subscription.create({
          data: {
            cancelAtPeriodEnd: subscription.cancel_at_period_end,
            currentPeriodEnd: new Date(subscription.items.data[0]?.current_period_end * 1000),
            metadata: {
              ...subscription.metadata,
              // Store collection method to know this is a crypto invoice-based subscription
              collectionMethod: subscription.collection_method,
              isCryptoPayment: subscription.metadata?.isCryptoPayment || 'false',
            },
            status: mappedStatus,
            stripeCustomerId: customerId,
            stripePriceId: priceId || '',
            stripeSubscriptionId: subscription.id,
            tier: getSubscriptionTier(priceId, mappedStatus),
            transactionType: TransactionType.RECURRING,
            userId,
          },
        })

        debugLog(
          `Created new subscription record ${newSubscription.id} for Stripe subscription ${subscription.id}`,
        )
      }

      debugLog('Finished processing inside withErrorHandling for handleSubscriptionEvent', {
        subscriptionId: subscription.id,
        userId,
      })
      return true
    },
    `handleSubscriptionEvent(${subscription.id})`,
    userId,
  )

  const finalResult = result !== null
  debugLog('Exiting handleSubscriptionEvent', { finalResult, subscriptionId: subscription.id })
  return finalResult
}

/**
 * Handles a subscription deleted event from Stripe
 * @param subscription The Stripe subscription
 * @param tx The transaction client
 * @returns True if the operation was successful, false otherwise
 */
export async function handleSubscriptionDeleted(
  subscription: Stripe.Subscription,
  tx: Prisma.TransactionClient,
): Promise<boolean> {
  debugLog('Entering handleSubscriptionDeleted', { subscriptionId: subscription.id })
  const result = await withErrorHandling(async () => {
    debugLog('Inside withErrorHandling for handleSubscriptionDeleted', {
      subscriptionId: subscription.id,
    })
    // Find the subscription record
    debugLog('Finding existing subscription record for deletion', {
      stripeSubscriptionId: subscription.id,
    })
    const existingSubscription = await tx.subscription.findFirst({
      where: {
        stripeSubscriptionId: subscription.id,
      },
    })

    if (existingSubscription) {
      debugLog('Found existing subscription, marking as canceled...', {
        id: existingSubscription.id,
        stripeSubscriptionId: subscription.id,
      })
      // Update the subscription status to canceled
      await tx.subscription.update({
        data: {
          cancelAtPeriodEnd: true,
          metadata: {
            ...(existingSubscription.metadata as Record<string, unknown>),
            canceledAt: new Date().toISOString(),
          },
          status: SubscriptionStatus.CANCELED,
          updatedAt: new Date(),
        },
        where: {
          id: existingSubscription.id,
        },
      })

      debugLog(`Marked subscription ${existingSubscription.id} as canceled`)
    } else {
      debugLog('No existing subscription found to mark as canceled', {
        stripeSubscriptionId: subscription.id,
      })
    }

    debugLog('Finished processing inside withErrorHandling for handleSubscriptionDeleted', {
      subscriptionId: subscription.id,
    })
    return true
  }, `handleSubscriptionDeleted(${subscription.id})`)

  const finalResult = result !== null
  debugLog('Exiting handleSubscriptionDeleted', { finalResult, subscriptionId: subscription.id })
  return finalResult
}

/**
 * Maps a Stripe subscription status to a SubscriptionStatus
 * @param status The Stripe subscription status
 * @returns The corresponding SubscriptionStatus
 */
function mapStripeStatus(status: string): SubscriptionStatus {
  debugLog('Mapping Stripe status', { status })
  let mappedStatus: SubscriptionStatus
  switch (status) {
    case 'active': {
      mappedStatus = SubscriptionStatus.ACTIVE
      break
    }
    case 'trialing': {
      mappedStatus = SubscriptionStatus.TRIALING
      break
    }
    case 'canceled': {
      mappedStatus = SubscriptionStatus.CANCELED
      break
    }
    case 'incomplete':
    case 'incomplete_expired':
    case 'past_due':
    case 'unpaid': {
      mappedStatus = SubscriptionStatus.PAST_DUE
      break
    }
    default: {
      mappedStatus = SubscriptionStatus.CANCELED
      break
    }
  }
  debugLog('Finished mapping Stripe status', { mappedStatus, status })
  return mappedStatus
}
