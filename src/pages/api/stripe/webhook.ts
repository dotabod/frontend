import prisma from '@/lib/db'
import { stripe } from '@/lib/stripe-server'
import { getSubscriptionTier } from '@/utils/subscription'
import { type Prisma, SubscriptionStatus, TransactionType } from '@prisma/client'
import type { NextApiRequest, NextApiResponse } from 'next'
import type Stripe from 'stripe'

export const config = {
  api: {
    bodyParser: false,
  },
}

const relevantEvents = new Set([
  'customer.subscription.created',
  'customer.subscription.updated',
  'customer.subscription.deleted',
  'customer.deleted',
  'invoice.payment_succeeded',
  'invoice.payment_failed',
  'checkout.session.completed',
  'charge.succeeded',
])

// Stripe statuses to Prisma statuses
const statusMap: Record<Stripe.Subscription.Status, SubscriptionStatus> = {
  active: 'ACTIVE',
  canceled: 'CANCELED',
  incomplete: 'INCOMPLETE',
  incomplete_expired: 'INCOMPLETE_EXPIRED',
  past_due: 'PAST_DUE',
  paused: 'PAUSED',
  trialing: 'TRIALING',
  unpaid: 'UNPAID',
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const signature = req.headers['stripe-signature'] as string
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  if (!signature || !webhookSecret) {
    return res.status(400).json({ error: 'Webhook configuration error' })
  }

  let event: Stripe.Event
  try {
    const rawBody = await getRawBody(req)
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret)
  } catch (err) {
    console.error('Webhook verification failed:', err)
    return res.status(400).json({ error: 'Webhook verification failed' })
  }

  if (!relevantEvents.has(event.type)) {
    return res.status(200).json({ received: true })
  }

  // Maximum number of retry attempts for transaction failures
  const MAX_RETRIES = 3
  let retryCount = 0
  let lastError: Error | unknown = null

  while (retryCount < MAX_RETRIES) {
    try {
      // First check if we've already processed this event (outside of transaction to avoid locking)
      const existingEvent = await prisma.webhookEvent.findUnique({
        where: { stripeEventId: event.id },
      })

      if (existingEvent) {
        // Event already processed (idempotency)
        return res.status(200).json({ received: true })
      }

      // Process the event in a transaction
      await prisma.$transaction(
        async (tx) => {
          // Record the event to ensure idempotency
          await tx.webhookEvent.create({
            data: {
              stripeEventId: event.id,
              eventType: event.type,
              processedAt: new Date(),
            },
          })

          // Process the webhook event
          await processWebhookEvent(event, tx)
        },
        {
          // Set a longer timeout for complex operations
          timeout: 10000, // 10 seconds
        },
      )

      return res.status(200).json({ received: true })
    } catch (error) {
      lastError = error
      retryCount++

      // Log the error but continue with retries
      console.error(`Webhook processing attempt ${retryCount} failed:`, error)

      // Wait before retrying (exponential backoff)
      if (retryCount < MAX_RETRIES) {
        const delay = 2 ** retryCount * 500 // 1s, 2s, 4s
        await new Promise((resolve) => setTimeout(resolve, delay))
      }
    }
  }

  // If we've exhausted all retries, return an error
  console.error('Webhook processing failed after multiple attempts:', lastError)
  return res.status(500).json({ error: 'Webhook processing failed' })
}

async function processWebhookEvent(event: Stripe.Event, tx: Prisma.TransactionClient) {
  switch (event.type) {
    case 'customer.deleted':
      await handleCustomerDeleted(event.data.object as Stripe.Customer, tx)
      break
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
      await handleSubscriptionEvent(event.data.object as Stripe.Subscription, tx)
      break
    case 'customer.subscription.deleted':
      await handleSubscriptionDeleted(event.data.object as Stripe.Subscription, tx)
      break
    case 'invoice.payment_succeeded':
    case 'invoice.payment_failed':
      await handleInvoiceEvent(event.data.object as Stripe.Invoice, tx)
      break
    case 'checkout.session.completed':
      await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session, tx)
      break
    case 'charge.succeeded':
      await handleChargeSucceeded(event.data.object as Stripe.Charge, tx)
      break
  }
}
async function handleCustomerDeleted(customer: Stripe.Customer, tx: Prisma.TransactionClient) {
  await tx.subscription.deleteMany({
    where: {
      OR: [{ userId: customer.metadata?.userId }, { stripeCustomerId: customer.id }],
    },
  })
}

async function handleSubscriptionEvent(
  subscription: Stripe.Subscription,
  tx: Prisma.TransactionClient,
) {
  const customer = await stripe.customers.retrieve(subscription.customer as string)
  const userId = (customer as Stripe.Customer).metadata?.userId
  if (!userId) return

  const status = statusMap[subscription.status as Stripe.Subscription.Status]
  if (!status) return

  const priceId = subscription.items.data[0].price.id

  await tx.subscription.upsert({
    where: {
      stripeSubscriptionId: subscription.id,
    },
    create: {
      stripeSubscriptionId: subscription.id,
      stripeCustomerId: subscription.customer as string,
      status: status as SubscriptionStatus,
      tier: getSubscriptionTier(priceId, status),
      stripePriceId: priceId,
      userId,
      transactionType: TransactionType.RECURRING,
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
    },
    update: {
      status: status as SubscriptionStatus,
      tier: getSubscriptionTier(priceId, status),
      stripePriceId: priceId,
      stripeCustomerId: subscription.customer as string,
      transactionType: TransactionType.RECURRING,
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
    },
  })
}

async function handleSubscriptionDeleted(
  subscription: Stripe.Subscription,
  tx: Prisma.TransactionClient,
) {
  const customer = await stripe.customers.retrieve(subscription.customer as string)
  const userId = (customer as Stripe.Customer).metadata?.userId
  if (!userId) return

  await tx.subscription.updateMany({
    where: { stripeSubscriptionId: subscription.id },
    data: {
      status: 'CANCELED',
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      cancelAtPeriodEnd: true,
    },
  })
}

async function handleInvoiceEvent(invoice: Stripe.Invoice, tx: Prisma.TransactionClient) {
  if (invoice.subscription) {
    const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string)

    const status = statusMap[subscription.status] || null

    await tx.subscription.updateMany({
      where: { stripeSubscriptionId: subscription.id },
      data: {
        status,
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
      },
    })
  }
}

async function handleCheckoutCompleted(
  session: Stripe.Checkout.Session,
  tx: Prisma.TransactionClient,
) {
  // Handle gift subscriptions
  if (session.metadata?.isGift === 'true') {
    const recipientUserId = session.metadata.recipientUserId
    if (!recipientUserId) return

    const giftSenderName = session.metadata.giftSenderName || 'Anonymous'
    const giftMessage = session.metadata.giftMessage || ''
    const giftType = session.metadata.giftDuration || 'monthly'

    // Get the initial quantity from metadata
    let giftQuantity = Number.parseInt(session.metadata.giftQuantity || '1', 10)

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
    const recipientUser = await tx.user.findUnique({
      where: { id: recipientUserId },
      select: {
        id: true,
        email: true,
        name: true,
        image: true,
        locale: true,
        proExpiration: true,
      },
    })

    if (!recipientUser) {
      console.error(`Recipient user not found: ${recipientUserId}`)
      return
    }

    // Ensure the recipient has a Stripe customer ID
    const recipientCustomerId = await ensureCustomer(recipientUser, tx)

    // Find existing subscription for the recipient
    const existingSubscription = await tx.subscription.findFirst({
      where: {
        userId: recipientUserId,
        status: { in: ['ACTIVE', 'TRIALING'] },
      },
      orderBy: {
        currentPeriodEnd: 'desc',
      },
    })

    // Calculate the new expiration date based on gift type and quantity
    // If there's an existing subscription, extend it
    let currentPeriodEnd: Date

    if (giftType === 'lifetime') {
      // For lifetime gifts, set a far future date
      currentPeriodEnd = new Date('2099-12-31T23:59:59.999Z')
    } else {
      // For other gift types, calculate based on existing subscription or proExpiration
      const now = new Date()

      // Check if we're in the grace period
      const { isInGracePeriod, GRACE_PERIOD_END } = await import('@/utils/subscription')

      // Determine the starting point for the gift duration
      // If in grace period, start from the grace period end to avoid overlap
      let startDate: Date

      if (isInGracePeriod()) {
        // Start from the grace period end
        startDate = new Date(GRACE_PERIOD_END)
      } else {
        // Start from the later of now or existing expiration
        const existingExpiration =
          recipientUser.proExpiration || existingSubscription?.currentPeriodEnd || null
        startDate =
          existingExpiration && existingExpiration > now ? new Date(existingExpiration) : now
      }

      // Import the aggregateGiftDuration function from the gift-subscription module
      const { aggregateGiftDuration } = await import('@/lib/gift-subscription')

      // Calculate the new expiration date
      currentPeriodEnd = aggregateGiftDuration(giftType, giftQuantity, null, startDate)
    }

    // Create or update the subscription record
    let subscription: { id: string }

    if (existingSubscription) {
      // Update the existing subscription
      subscription = await tx.subscription.update({
        where: { id: existingSubscription.id },
        data: {
          currentPeriodEnd,
          // Only update status if it's not already active
          status:
            existingSubscription.status !== SubscriptionStatus.ACTIVE
              ? SubscriptionStatus.ACTIVE
              : existingSubscription.status,
          tier:
            existingSubscription.status !== SubscriptionStatus.ACTIVE
              ? getSubscriptionTier(null, SubscriptionStatus.ACTIVE)
              : existingSubscription.tier,
          // Add metadata about the gift
          metadata: {
            ...((existingSubscription.metadata as Record<string, unknown>) || {}),
            lastGiftAt: new Date().toISOString(),
            lastGiftType: giftType,
            lastGiftQuantity: giftQuantity.toString(),
          },
        },
      })
    } else {
      // Create a new subscription
      subscription = await tx.subscription.create({
        data: {
          userId: recipientUserId,
          status: SubscriptionStatus.ACTIVE,
          tier: getSubscriptionTier(null, SubscriptionStatus.ACTIVE),
          stripePriceId: session.metadata.priceId || '',
          stripeCustomerId: recipientCustomerId,
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
          },
        },
      })
    }

    // Create the gift subscription details
    const giftSubscription = await tx.giftSubscription.create({
      data: {
        subscriptionId: subscription.id,
        senderName: giftSenderName,
        giftMessage: giftMessage,
        giftType: giftType,
        giftQuantity: giftQuantity,
      },
    })

    // Create a notification for the recipient
    await tx.notification.create({
      data: {
        userId: recipientUserId,
        type: 'GIFT_SUBSCRIPTION',
        giftSubscriptionId: giftSubscription.id,
      },
    })

    // Create a gift transaction for auditing
    const giftTransaction = await tx.giftTransaction.create({
      data: {
        giftSubscriptionId: giftSubscription.id,
        recipientId: recipientUserId,
        gifterId: session.metadata.gifterId || null,
        giftType,
        giftQuantity,
        amount: paymentAmount || 0,
        currency: session.currency || 'usd',
        stripeSessionId: session.id,
        metadata: {
          giftSenderName,
          giftMessage,
          giftSenderEmail: session.metadata.giftSenderEmail || '',
          checkoutSessionId: session.id,
        },
      },
    })

    // Update the user's proExpiration field to match the subscription's currentPeriodEnd
    await tx.user.update({
      where: { id: recipientUserId },
      data: {
        proExpiration: currentPeriodEnd,
      },
    })

    return
  }

  // Handle regular (non-gift) subscriptions
  const userId = session.metadata?.userId
  if (!userId) return

  if (session.mode === 'subscription' && session.subscription) {
    const subscription = await stripe.subscriptions.retrieve(session.subscription as string)
    await handleSubscriptionEvent(subscription, tx)
  } else if (session.mode === 'payment') {
    const lineItems = await stripe.checkout.sessions.listLineItems(session.id)
    const priceId = lineItems.data[0]?.price?.id ?? null

    if (
      session.metadata?.isUpgradeToLifetime === 'true' &&
      session.metadata?.previousSubscriptionId
    ) {
      try {
        await stripe.subscriptions.cancel(session.metadata.previousSubscriptionId, {
          invoice_now: false,
          prorate: true,
        })
      } catch (error) {
        console.error('Failed to cancel previous subscription:', error)
      }
    }

    await createLifetimePurchase(userId, session.customer as string, priceId, tx)
  }
}

async function handleChargeSucceeded(charge: Stripe.Charge, tx: Prisma.TransactionClient) {
  const userId = charge.metadata?.userId
  if (!userId) return

  await createLifetimePurchase(
    userId,
    charge.customer as string,
    charge.amount > 0 ? charge.amount.toString() : null,
    tx,
  )
}

async function createLifetimePurchase(
  userId: string,
  customerId: string,
  priceId: string | null,
  tx: Prisma.TransactionClient,
) {
  await tx.subscription.create({
    data: {
      userId,
      status: SubscriptionStatus.ACTIVE,
      tier: getSubscriptionTier(priceId, SubscriptionStatus.ACTIVE),
      stripePriceId: priceId || '',
      stripeCustomerId: customerId,
      transactionType: TransactionType.LIFETIME,
      currentPeriodEnd: new Date('2099-12-31'),
      cancelAtPeriodEnd: false,
      stripeSubscriptionId: null,
    },
  })
}

async function getRawBody(req: NextApiRequest): Promise<string> {
  const chunks: Uint8Array[] = []
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk)
  }
  return Buffer.concat(chunks).toString()
}

// Helper function to ensure a customer exists for a user
async function ensureCustomer(
  user: {
    id: string
    email?: string | null
    name?: string | null
    image?: string | null
    locale?: string | null
  },
  tx: Prisma.TransactionClient,
): Promise<string> {
  // Look for any existing subscription to get a customer ID
  const subscription = await tx.subscription.findFirst({
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
      const newCustomer = await createStripeCustomer(user)
      customerId = newCustomer.id
    }

    if (!subscription?.stripeCustomerId) {
      // Update existing subscriptions with no customer ID
      await tx.subscription.updateMany({
        where: { userId: user.id, stripeCustomerId: null },
        data: { stripeCustomerId: customerId },
      })
    }
  }

  if (!customerId) {
    throw new Error('Unable to establish customer ID')
  }

  return customerId
}

async function createStripeCustomer(user: {
  id: string
  email?: string | null
  name?: string | null
  image?: string | null
  locale?: string | null
}) {
  return stripe.customers.create({
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
