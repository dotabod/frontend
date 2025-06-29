#!/usr/bin/env bun

import { PrismaClient, SubscriptionStatus, TransactionType } from '@prisma/client'
// Reverted import
import cliProgress from 'cli-progress'
import type Stripe from 'stripe'
import { stripe } from './src/lib/stripe-server'
import { getSubscriptionTier } from './src/utils/subscription'

const prisma = new PrismaClient()

async function processSingleCustomer(
  customer: Stripe.Customer,
  progressBar: cliProgress.SingleBar,
  customerSubscriptions: Stripe.Subscription[],
  customerCheckoutSessions: Stripe.Checkout.Session[],
): Promise<{ success: boolean; logs: string[] }> {
  const logs: string[] = []
  try {
    const userId = customer.metadata?.userId
    if (!userId) {
      logs.push(`Skipping customer ${customer.id} - no userId in metadata`)
      progressBar.increment()
      return { success: false, logs }
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    })

    if (!user) {
      logs.push(`Skipping customer ${customer.id} - user with ID ${userId} not found in database`)
      progressBar.increment()
      return { success: false, logs }
    }

    if (customerSubscriptions.length > 0) {
      logs.push(
        `Processing ${customerSubscriptions.length} subscriptions for customer ${customer.id}`,
      )
    }

    for (const subscription of customerSubscriptions) {
      const subscriptionResult = await processSubscription(subscription, customer, userId)
      logs.push(...subscriptionResult.logs)
      if (!subscriptionResult.success) {
        // If processing a specific subscription failed, we might consider the customer processing partially failed
        // For simplicity here, we continue but log the errors.
        // Modify error handling as needed.
      }
    }

    const lifetimeResult = await processLifetimePurchases(
      customer.id,
      userId,
      customerCheckoutSessions,
    )
    logs.push(...lifetimeResult.logs)

    const giftResult = await processGiftSubscriptions(customer.id, userId, customerCheckoutSessions)
    logs.push(...giftResult.logs)

    progressBar.increment()
    return { success: true, logs }
  } catch (error) {
    logs.push(
      `Error processing customer ${customer.id}: ${error instanceof Error ? error.message : error}`,
    )
    progressBar.increment()
    return { success: false, logs }
  }
}

async function importStripeCustomers(): Promise<void> {
  console.log('Starting Stripe customer and subscription import process...')

  try {
    const subscriptionMap = await fetchAllSubscriptionsGroupedByCustomer()
    const sessionMap = await fetchAllRelevantCheckoutSessionsGroupedByCustomer()

    console.log('Fetching customers from Stripe...')
    let customers = await fetchAllStripeCustomers()
    const totalCustomers = customers.length
    console.log(`\nFound ${totalCustomers} customers in Stripe\n`)

    customers = customers.reverse()
    console.log('Reversed customer list for processing.')

    const progressBar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic)
    progressBar.start(totalCustomers, 0)

    let processedCount = 0
    let errorCount = 0
    let skippedInactiveCount = 0

    for (const customer of customers) {
      const customerId = customer.id
      const customerSubscriptions = subscriptionMap.get(customerId) ?? []
      const customerSessions = sessionMap.get(customerId) ?? []

      if (customerSubscriptions.length === 0 && customerSessions.length === 0) {
        skippedInactiveCount++
        progressBar.increment()
        continue
      }

      try {
        const result = await processSingleCustomer(
          customer,
          progressBar,
          customerSubscriptions,
          customerSessions,
        )

        if (result.logs.length > 0 && !result.success) {
          console.log(
            `\n-- Logs for customer ${customer.id} --\n${result.logs.join('\n')}\n----------------`,
          )
        }

        if (result.success) {
          processedCount++
        } else {
          errorCount++
        }
      } catch (error) {
        console.error(`\nFATAL ERROR during processing customer ${customer.id}:`, error)
        errorCount++
        progressBar.increment()
      }
    }

    await new Promise((resolve) => setTimeout(resolve, 200))

    progressBar.stop()

    console.log('\nImport process completed')
    console.log(`Processed ${processedCount} customers with activity successfully`)
    console.log(
      `Skipped ${skippedInactiveCount} customers with no relevant activity (subscriptions/lifetime/gifts)`,
    )
    console.log(`Encountered errors or skipped ${errorCount} customers during processing`)
  } catch (error) {
    console.error('Fatal error during import:', error)
  } finally {
    await prisma.$disconnect()
  }
}

async function fetchAllStripeCustomers(): Promise<Stripe.Customer[]> {
  const customers: Stripe.Customer[] = []
  let hasMore = true
  let startingAfter: string | undefined

  while (hasMore) {
    const response = await stripe.customers.list({
      limit: 100,
      starting_after: startingAfter,
      expand: ['data.subscriptions'],
    })

    customers.push(...response.data)
    hasMore = response.has_more

    if (hasMore && response.data.length > 0) {
      startingAfter = response.data[response.data.length - 1].id
    }
  }

  return customers
}

async function fetchAllSubscriptionsGroupedByCustomer(): Promise<
  Map<string, Stripe.Subscription[]>
> {
  console.log('Fetching all subscriptions from Stripe...')
  const subscriptionMap = new Map<string, Stripe.Subscription[]>()
  let hasMore = true
  let startingAfter: string | undefined
  let count = 0

  while (hasMore) {
    const response = await stripe.subscriptions.list({
      limit: 100,
      starting_after: startingAfter,
      status: 'all',
    })

    for (const subscription of response.data) {
      const customerId = subscription.customer as string
      if (customerId) {
        const existing = subscriptionMap.get(customerId) ?? []
        existing.push(subscription)
        subscriptionMap.set(customerId, existing)
      }
    }

    count += response.data.length
    process.stdout.write(`Fetched ${count} subscriptions...\r`)

    hasMore = response.has_more
    if (hasMore && response.data.length > 0) {
      startingAfter = response.data[response.data.length - 1].id
    } else {
      break
    }
  }
  console.log(
    `\nFetched a total of ${count} subscriptions. Grouped by ${subscriptionMap.size} customers.`,
  )
  return subscriptionMap
}

async function fetchAllRelevantCheckoutSessionsGroupedByCustomer(): Promise<
  Map<string, Stripe.Checkout.Session[]>
> {
  console.log('Fetching all completed checkout sessions from Stripe...')
  const sessionMap = new Map<string, Stripe.Checkout.Session[]>()
  let hasMore = true
  let startingAfter: string | undefined
  let fetchedCount = 0
  let relevantCount = 0

  const { getCurrentPeriod } = await import('./src/utils/subscription')
  const isLifetimePriceLocal = async (priceId: string): Promise<boolean> => {
    try {
      const pricePeriod = getCurrentPeriod(priceId)
      return pricePeriod === 'lifetime'
    } catch (error) {
      console.warn(
        `WARN: Error checking if price ${priceId} is lifetime: ${error instanceof Error ? error.message : error}. Assuming not lifetime.`,
      )
      return false
    }
  }

  while (hasMore) {
    const response = await stripe.checkout.sessions.list({
      limit: 100,
      starting_after: startingAfter,
      status: 'complete',
    })

    fetchedCount += response.data.length
    process.stdout.write(`Fetched ${fetchedCount} sessions...\r`)

    for (const session of response.data) {
      if (!session.customer) continue

      const customerId = session.customer as string
      let isRelevant = false

      if (session.metadata?.isGift === 'true') {
        isRelevant = true
      } else if (session.mode === 'payment') {
        let lineItems: Stripe.LineItem[]
        try {
          const lineItemsResponse = await stripe.checkout.sessions.listLineItems(session.id, {
            limit: 1, // Only need one item to check the price
          })
          lineItems = lineItemsResponse.data
        } catch (listLineItemsError) {
          console.warn(
            `WARN: Failed to fetch line items for session ${session.id}: ${listLineItemsError instanceof Error ? listLineItemsError.message : listLineItemsError}. Skipping lifetime check for this session.`,
          )
          lineItems = [] // Ensure lineItems is an empty array to skip processing below
        }

        const priceId = lineItems?.[0]?.price?.id
        if (priceId) {
          const isLifetime = await isLifetimePriceLocal(priceId)
          if (isLifetime) {
            isRelevant = true
          }
        }
      }

      if (isRelevant) {
        relevantCount++
        const existing = sessionMap.get(customerId) ?? []
        existing.push(session)
        sessionMap.set(customerId, existing)
      }
    }

    hasMore = response.has_more
    if (hasMore && response.data.length > 0) {
      startingAfter = response.data[response.data.length - 1].id
    } else {
      break
    }
  }

  console.log(
    `\nFetched a total of ${fetchedCount} completed sessions. Found ${relevantCount} relevant (lifetime/gift) sessions for ${sessionMap.size} customers.`,
  )
  return sessionMap
}

async function processSubscription(
  subscription: Stripe.Subscription,
  customer: Stripe.Customer,
  userId: string,
): Promise<{ success: boolean; logs: string[] }> {
  const logs: string[] = []
  let success = true
  try {
    const existingSubscription = await prisma.subscription.findFirst({
      where: {
        stripeSubscriptionId: subscription.id,
      },
    })

    const priceId = subscription.items.data[0]?.price?.id ?? null

    let currentPeriodEnd: Date | null = null

    if (
      subscription.items?.data[0]?.current_period_end &&
      typeof subscription.items?.data[0]?.current_period_end === 'number' &&
      subscription.items?.data[0]?.current_period_end > 0
    ) {
      currentPeriodEnd = new Date(subscription.items?.data[0]?.current_period_end * 1000)

      if (Number.isNaN(currentPeriodEnd.getTime())) {
        logs.push(
          `WARN: Invalid current_period_end timestamp for subscription ${subscription.id}, using current date instead`,
        )
        currentPeriodEnd = new Date()
      }
    } else
      logs.push(
        `WARN: Missing current_period_end for subscription ${subscription.id}, using current date instead`,
      )
    currentPeriodEnd = new Date()

    const status = mapStripeStatus(subscription.status)
    const tier = getSubscriptionTier(priceId, status)

    const subscriptionData = {
      user: {
        connect: { id: userId },
      },
      status,
      tier,
      stripePriceId: priceId || '',
      stripeCustomerId: customer.id,
      transactionType: TransactionType.RECURRING,
      currentPeriodEnd,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      stripeSubscriptionId: subscription.id,
      metadata: {
        ...(subscription.metadata || {}),
        ...(customer.metadata || {}),
        collectionMethod: subscription.collection_method,
        isCryptoPayment: customer.metadata?.isCryptoPayment || 'false',
      },
      updatedAt: new Date(),
    }

    if (existingSubscription) {
      logs.push(
        `Updating existing subscription ${existingSubscription.id} for Stripe subscription ${subscription.id}`,
      )
      await prisma.subscription.update({
        where: {
          id: existingSubscription.id,
        },
        data: subscriptionData,
      })
    } else {
      logs.push(`Creating new subscription record for Stripe subscription ${subscription.id}`)
      await prisma.subscription.create({
        data: subscriptionData,
      })
    }

    return { success, logs }
  } catch (error) {
    logs.push(
      `ERROR processing subscription ${subscription.id}: ${error instanceof Error ? error.message : error}`,
    )
    success = false
    return { success, logs }
  }
}

async function processLifetimePurchases(
  customerId: string,
  userId: string,
  checkoutSessions: Stripe.Checkout.Session[],
): Promise<{ success: boolean; logs: string[] }> {
  const logs: string[] = []
  let success = true
  try {
    const lifetimeSessions = checkoutSessions.filter(
      (session) => session.mode === 'payment' && session.metadata?.isGift !== 'true',
    )

    if (lifetimeSessions.length > 0) {
      logs.push(
        `Found ${lifetimeSessions.length} potential lifetime checkout sessions for customer ${customerId}`,
      )
    }

    for (const session of lifetimeSessions) {
      const lineItems = await stripe.checkout.sessions.listLineItems(session.id, { limit: 1 })
      const priceId = lineItems.data[0]?.price?.id

      if (!priceId) {
        logs.push(`WARN: Could not find price ID for lifetime session ${session.id}, skipping.`)
        continue
      }

      const existingLifetime = await prisma.subscription.findFirst({
        where: {
          userId,
          transactionType: TransactionType.LIFETIME,
          metadata: {
            path: ['checkoutSessionId'],
            equals: session.id,
          },
        },
      })

      if (!existingLifetime) {
        logs.push(`Creating lifetime subscription record for checkout session ${session.id}`)

        const farFutureDate = new Date()
        farFutureDate.setFullYear(farFutureDate.getFullYear() + 100)

        await prisma.subscription.create({
          data: {
            userId,
            stripeCustomerId: customerId,
            stripePriceId: priceId,
            status: SubscriptionStatus.ACTIVE,
            tier: 'PRO',
            transactionType: TransactionType.LIFETIME,
            currentPeriodEnd: farFutureDate,
            cancelAtPeriodEnd: false,
            metadata: {
              checkoutSessionId: session.id,
              ...(session.metadata || {}),
            },
          },
        })
      } else {
        logs.push(`Lifetime subscription for session ${session.id} already exists.`)
      }
    }

    return { success, logs }
  } catch (error) {
    logs.push(
      `ERROR processing lifetime purchases for customer ${customerId}: ${error instanceof Error ? error.message : error}`,
    )
    success = false
    return { success, logs }
  }
}

async function processGiftSubscriptions(
  customerId: string,
  userId: string,
  checkoutSessions: Stripe.Checkout.Session[],
): Promise<{ success: boolean; logs: string[] }> {
  const logs: string[] = []
  let success = true
  try {
    const giftSessions = checkoutSessions.filter((session) => session.metadata?.isGift === 'true')

    if (giftSessions.length > 0) {
      logs.push(`Found ${giftSessions.length} gift checkout sessions for customer ${customerId}`)
    }

    for (const session of giftSessions) {
      const recipientUserId = session.metadata?.recipientUserId

      if (!recipientUserId) {
        logs.push(`Skipping gift session ${session.id} - no recipient userId`)
        continue
      }

      const existingGiftTransaction = await prisma.giftTransaction.findFirst({
        where: {
          stripeSessionId: session.id,
        },
      })

      if (!existingGiftTransaction) {
        logs.push(`Creating gift transaction record for checkout session ${session.id}`)

        const giftSenderName = session.metadata?.giftSenderName || 'Anonymous'
        const giftMessage = session.metadata?.giftMessage || ''
        const giftType = session.metadata?.giftDuration || 'monthly'
        const giftQuantity = Number.parseInt(session.metadata?.giftQuantity || '1', 10)

        let currentPeriodEnd: Date
        if (giftType === 'lifetime') {
          const farFutureDate = new Date()
          farFutureDate.setFullYear(farFutureDate.getFullYear() + 100)
          currentPeriodEnd = farFutureDate
        } else if (giftType === 'annual') {
          const oneYearFromNow = new Date()
          oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1)
          currentPeriodEnd = oneYearFromNow
        } else {
          const oneMonthFromNow = new Date()
          oneMonthFromNow.setMonth(oneMonthFromNow.getMonth() + 1)
          currentPeriodEnd = oneMonthFromNow
        }

        const giftTransaction = await prisma.giftTransaction.create({
          data: {
            recipientId: recipientUserId,
            gifterId: session.metadata?.gifterId || userId,
            giftType,
            giftQuantity,
            amount: session.amount_total || 0,
            currency: session.currency || 'usd',
            stripeSessionId: session.id,
            metadata: {
              giftSenderName,
              giftMessage,
              giftSenderEmail: session.metadata?.giftSenderEmail || '',
              checkoutSessionId: session.id,
              ...(session.metadata || {}),
            },
            giftSubscription: {
              create: {
                senderName: giftSenderName,
                giftMessage,
                giftType,
                giftQuantity,
                subscription: {
                  create: {
                    userId: recipientUserId,
                    stripeCustomerId: session.customer as string,
                    status: SubscriptionStatus.ACTIVE,
                    tier: getSubscriptionTier(null, SubscriptionStatus.ACTIVE),
                    transactionType:
                      giftType === 'lifetime'
                        ? TransactionType.LIFETIME
                        : TransactionType.RECURRING,
                    isGift: true,
                    currentPeriodEnd,
                    cancelAtPeriodEnd: giftType !== 'lifetime',
                    metadata: {
                      giftType,
                      giftQuantity: giftQuantity.toString(),
                      checkoutSessionId: session.id,
                      gifterCustomerId: customerId,
                      gifterUserId: userId,
                    },
                  },
                },
              },
            },
          },
        })

        await prisma.notification.create({
          data: {
            userId: recipientUserId,
            type: 'GIFT_SUBSCRIPTION',
            isRead: false,
            giftSubscriptionId: giftTransaction.giftSubscriptionId,
          },
        })
      } else {
        logs.push(`Gift transaction for session ${session.id} already exists.`)
      }
    }

    return { success, logs }
  } catch (error) {
    logs.push(
      `ERROR processing gift subscriptions for customer ${customerId}: ${error instanceof Error ? error.message : error}`,
    )
    success = false
    return { success, logs }
  }
}

function mapStripeStatus(status: string): SubscriptionStatus {
  switch (status) {
    case 'active':
      return SubscriptionStatus.ACTIVE
    case 'trialing':
      return SubscriptionStatus.TRIALING
    case 'canceled':
      return SubscriptionStatus.CANCELED
    case 'incomplete':
    case 'incomplete_expired':
    case 'past_due':
    case 'unpaid':
      return SubscriptionStatus.PAST_DUE
    default:
      return SubscriptionStatus.CANCELED
  }
}

// Run the import process
importStripeCustomers().catch(console.error)
