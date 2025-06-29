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
    subscriptionId: subscription.id,
    status: subscription.status,
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

  const userId = customer.metadata.userId
  if (!userId) {
    debugLog('No userId found in customer metadata, exiting handleSubscriptionEvent', {
      customerId,
    })
    return false
  }
  debugLog('Found userId in metadata', { userId, customerId })

  const result = await withErrorHandling(
    async () => {
      debugLog('Inside withErrorHandling for handleSubscriptionEvent', {
        userId,
        subscriptionId: subscription.id,
      })
      // Get the price ID from the subscription
      const priceId = subscription.items.data[0]?.price.id ?? null
      debugLog('Extracted priceId', { priceId, subscriptionId: subscription.id })
      const mappedStatus = mapStripeStatus(subscription.status)
      debugLog('Mapped Stripe status', { stripeStatus: subscription.status, mappedStatus })

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
          where: {
            id: existingSubscription.id,
          },
          data: {
            status: mappedStatus,
            tier: getSubscriptionTier(priceId, mappedStatus),
            stripePriceId: priceId || '',
            currentPeriodEnd: new Date(subscription.items.data[0]?.current_period_end * 1000),
            cancelAtPeriodEnd: subscription.cancel_at_period_end,
            metadata: {
              ...subscription.metadata,
              // Store collection method to know this is a crypto invoice-based subscription
              collectionMethod: subscription.collection_method,
              isCryptoPayment: subscription.metadata?.isCryptoPayment || 'false',
            },
            updatedAt: new Date(),
          },
        })

        debugLog(`Updated subscription ${existingSubscription.id} status to ${mappedStatus}`)
      } else {
        debugLog('No existing subscription found, creating new record...', {
          userId,
          stripeSubscriptionId: subscription.id,
        })
        // Create a new subscription record
        const newSubscription = await tx.subscription.create({
          data: {
            userId,
            status: mappedStatus,
            tier: getSubscriptionTier(priceId, mappedStatus),
            stripePriceId: priceId || '',
            stripeCustomerId: customerId,
            transactionType: TransactionType.RECURRING,
            currentPeriodEnd: new Date(subscription.items.data[0]?.current_period_end * 1000),
            cancelAtPeriodEnd: subscription.cancel_at_period_end,
            stripeSubscriptionId: subscription.id,
            metadata: {
              ...subscription.metadata,
              // Store collection method to know this is a crypto invoice-based subscription
              collectionMethod: subscription.collection_method,
              isCryptoPayment: subscription.metadata?.isCryptoPayment || 'false',
            },
          },
        })

        debugLog(
          `Created new subscription record ${newSubscription.id} for Stripe subscription ${subscription.id}`,
        )
      }

      debugLog('Finished processing inside withErrorHandling for handleSubscriptionEvent', {
        userId,
        subscriptionId: subscription.id,
      })
      return true
    },
    `handleSubscriptionEvent(${subscription.id})`,
    userId,
  )

  const finalResult = result !== null
  debugLog('Exiting handleSubscriptionEvent', { subscriptionId: subscription.id, finalResult })
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
        where: {
          id: existingSubscription.id,
        },
        data: {
          status: SubscriptionStatus.CANCELED,
          cancelAtPeriodEnd: true,
          metadata: {
            ...((existingSubscription.metadata as Record<string, unknown>) || {}),
            canceledAt: new Date().toISOString(),
          },
          updatedAt: new Date(),
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
  debugLog('Exiting handleSubscriptionDeleted', { subscriptionId: subscription.id, finalResult })
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
    case 'active':
      mappedStatus = SubscriptionStatus.ACTIVE
      break
    case 'trialing':
      mappedStatus = SubscriptionStatus.TRIALING
      break
    case 'canceled':
      mappedStatus = SubscriptionStatus.CANCELED
      break
    case 'incomplete':
    case 'incomplete_expired':
    case 'past_due':
    case 'unpaid':
      mappedStatus = SubscriptionStatus.PAST_DUE
      break
    default:
      mappedStatus = SubscriptionStatus.CANCELED
      break
  }
  debugLog('Finished mapping Stripe status', { status, mappedStatus })
  return mappedStatus
}
