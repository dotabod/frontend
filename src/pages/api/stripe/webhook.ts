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

  try {
    await prisma.$transaction(async (tx) => {
      const existingEvent = await tx.webhookEvent.findUnique({
        where: { stripeEventId: event.id },
      })

      if (existingEvent) {
        return // Idempotency
      }

      await tx.webhookEvent.create({
        data: {
          stripeEventId: event.id,
          eventType: event.type,
          processedAt: new Date(),
        },
      })

      await processWebhookEvent(event, tx)
    })

    return res.status(200).json({ received: true })
  } catch (error) {
    console.error('Webhook processing failed:', error)
    return res.status(500).json({ error: 'Webhook processing failed' })
  }
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

    // For non-lifetime subscriptions, get the actual quantity from the line items
    // in case the customer adjusted it during checkout
    if (giftType !== 'lifetime' && session.mode === 'subscription') {
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
    }

    if (session.mode === 'subscription' && session.subscription) {
      const subscription = await stripe.subscriptions.retrieve(session.subscription as string)

      // For gift subscriptions, we need to create the subscription record with the recipient's userId
      const status = statusMap[subscription.status as Stripe.Subscription.Status]
      if (!status) return

      const priceId = subscription.items.data[0].price.id

      // Calculate the end date based on quantity
      const currentPeriodEnd = new Date(subscription.current_period_end * 1000)

      // If quantity > 1, extend the period end date
      if (giftQuantity > 1) {
        if (giftType === 'monthly') {
          // Add (quantity - 1) months to the end date
          currentPeriodEnd.setMonth(currentPeriodEnd.getMonth() + (giftQuantity - 1))
        } else if (giftType === 'annual') {
          // Add (quantity - 1) years to the end date
          currentPeriodEnd.setFullYear(currentPeriodEnd.getFullYear() + (giftQuantity - 1))
        }
      }

      // Create the subscription with isGift flag
      const createdSubscription = await tx.subscription.upsert({
        where: {
          stripeSubscriptionId: subscription.id,
        },
        create: {
          stripeSubscriptionId: subscription.id,
          stripeCustomerId: subscription.customer as string,
          status: status as SubscriptionStatus,
          tier: getSubscriptionTier(priceId, status),
          stripePriceId: priceId,
          userId: recipientUserId,
          transactionType: TransactionType.RECURRING,
          currentPeriodEnd: currentPeriodEnd,
          cancelAtPeriodEnd: subscription.cancel_at_period_end,
          isGift: true,
        },
        update: {
          status: status as SubscriptionStatus,
          tier: getSubscriptionTier(priceId, status),
          stripePriceId: priceId,
          stripeCustomerId: subscription.customer as string,
          transactionType: TransactionType.RECURRING,
          currentPeriodEnd: currentPeriodEnd,
          cancelAtPeriodEnd: subscription.cancel_at_period_end,
          isGift: true,
        },
      })

      // Create the gift subscription details
      const giftSubscription = await tx.giftSubscription.create({
        data: {
          subscriptionId: createdSubscription.id,
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
    } else if (session.mode === 'payment') {
      // For lifetime gift subscriptions
      const lineItems = await stripe.checkout.sessions.listLineItems(session.id)
      const priceId = lineItems.data[0]?.price?.id ?? null

      // Create the lifetime subscription with gift details
      const createdSubscription = await tx.subscription.create({
        data: {
          userId: recipientUserId,
          status: SubscriptionStatus.ACTIVE,
          tier: getSubscriptionTier(priceId, SubscriptionStatus.ACTIVE),
          stripePriceId: priceId || '',
          stripeCustomerId: session.customer as string,
          transactionType: TransactionType.LIFETIME,
          currentPeriodEnd: new Date('2099-12-31'),
          cancelAtPeriodEnd: false,
          stripeSubscriptionId: null,
          isGift: true,
        },
      })

      // Create the gift subscription details
      const giftSubscription = await tx.giftSubscription.create({
        data: {
          subscriptionId: createdSubscription.id,
          senderName: giftSenderName,
          giftMessage: giftMessage,
          giftType: 'lifetime',
          giftQuantity: 1, // Lifetime subscriptions always have quantity 1
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
    }

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
