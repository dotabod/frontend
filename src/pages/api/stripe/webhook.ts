import prisma from '@/lib/db'
import { stripe } from '@/lib/stripe-server'
import { getSubscriptionTier } from '@/utils/subscription'
import type { NextApiRequest, NextApiResponse } from 'next'
import type Stripe from 'stripe'

// Disable the default body parser
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
])

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log('Received webhook request:', {
    method: req.method,
    headers: req.headers,
  })

  if (req.method !== 'POST') {
    console.log('Invalid request method:', req.method)
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const signature = req.headers['stripe-signature'] as string
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  if (!signature || !webhookSecret) {
    console.log('Missing webhook secret or signature:', { signature, webhookSecret })
    return res.status(400).json({ error: 'Missing stripe webhook secret' })
  }

  let event: Stripe.Event

  try {
    const chunks: Uint8Array[] = []

    for await (const chunk of req) {
      chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk)
    }

    const rawBody = Buffer.concat(chunks).toString()
    console.log('Raw webhook body:', rawBody)

    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret)
    console.log('Constructed webhook event:', event)
  } catch (err) {
    console.error('Error verifying webhook:', err)
    return res.status(400).json({ error: 'Webhook error' })
  }

  if (relevantEvents.has(event.type)) {
    console.log('Processing relevant event:', event.type)
    try {
      switch (event.type) {
        case 'customer.deleted': {
          console.log('Processing customer.deleted event')
          const customer = event.data.object as Stripe.Customer
          await handleCustomerDeleted(customer)
          break
        }
        case 'customer.subscription.created':
        case 'customer.subscription.updated':
        case 'customer.subscription.deleted': {
          console.log('Processing subscription event:', event.type)
          const subscription = event.data.object as Stripe.Subscription
          await updateSubscriptionInDatabase(subscription)
          break
        }
        case 'invoice.payment_succeeded': {
          console.log('Processing invoice.payment_succeeded event')
          const invoice = event.data.object as Stripe.Invoice
          if (invoice.subscription) {
            const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string)
            await updateSubscriptionInDatabase(subscription)
          }
          break
        }
        case 'invoice.payment_failed': {
          console.log('Processing invoice.payment_failed event')
          const invoice = event.data.object as Stripe.Invoice
          if (invoice.subscription) {
            const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string)
            await updateSubscriptionInDatabase(subscription)
          }
          break
        }
        case 'checkout.session.completed': {
          console.log('Processing checkout.session.completed event')
          const session = event.data.object as Stripe.Checkout.Session

          if (session.mode === 'subscription') {
            console.log('Subscription mode checkout completed - waiting for subscription webhook')
          } else if (session.mode === 'payment') {
            console.log('Processing payment mode checkout')
            const lineItems = await stripe.checkout.sessions.listLineItems(session.id)
            const priceId = lineItems.data[0]?.price?.id
            console.log('Retrieved line items:', { lineItems, priceId })

            // Get userId from session metadata
            const userId = session.metadata?.userId
            if (!userId) {
              console.error('No userId found in session metadata')
              return res.status(400).json({ error: 'No userId found' })
            }

            // Find existing subscription first
            const existingSubscription = await prisma.subscription.findUnique({
              where: { userId },
            })

            const subscriptionData = {
              status: 'active' as const,
              tier: getSubscriptionTier(priceId, 'active'),
              stripePriceId: priceId || '',
              stripeCustomerId: session.customer as string,
              currentPeriodEnd: new Date('2099-12-31'), // Lifetime access
              cancelAtPeriodEnd: false,
            }
            console.log('Prepared subscription data:', subscriptionData)

            if (existingSubscription) {
              console.log('Updating existing subscription')
              await prisma.subscription.update({
                where: { userId },
                data: subscriptionData,
              })
            } else {
              console.log('Creating new subscription')
              await prisma.subscription.create({
                data: {
                  userId,
                  ...subscriptionData,
                },
              })
            }
          }
          break
        }
        default:
          console.warn('Unhandled relevant event:', event.type)
          throw new Error(`Unhandled relevant event: ${event.type}`)
      }
    } catch (error) {
      console.error('Error processing webhook event:', error)
      return res.status(500).json({ error: 'Webhook handler failed' })
    }
  }

  return res.status(200).json({ received: true })
}

async function handleCustomerDeleted(customer: Stripe.Customer) {
  console.log('Handling customer deleted:', customer)
  // First try to find subscription by customer ID or check metadata for userId
  const existingSubscription =
    (await prisma.subscription.findFirst({
      where: { stripeCustomerId: customer.id },
    })) ||
    (await prisma.subscription.findUnique({
      where: { userId: customer.metadata?.userId as string },
    }))

  if (!existingSubscription) {
    console.warn(`No subscription found for deleted customer: ${customer.id}`)
    return
  }

  console.log('Deleting subscription:', existingSubscription)
  // Update using userId instead of stripeCustomerId
  await prisma.subscription.delete({
    where: { userId: existingSubscription.userId },
  })
}

async function updateSubscriptionInDatabase(subscription: Stripe.Subscription) {
  const priceId = subscription.items.data[0].price.id
  const customerId = subscription.customer as string

  console.log('Updating subscription:', {
    customerId,
    priceId,
    subscription,
    status: subscription.status,
  })

  // Get the customer to find the userId from metadata
  const customer = await stripe.customers.retrieve(customerId)
  const userId = (customer as Stripe.Customer).metadata?.userId

  if (!userId) {
    console.error('No userId found in customer metadata:', customerId)
    return
  }

  // Try to find subscription by userId
  const existingSubscription = await prisma.subscription.findUnique({
    where: { userId },
  })

  console.log('Found existing subscription:', existingSubscription)

  // Update existing subscription
  const updateData = {
    status: subscription.status,
    tier: getSubscriptionTier(priceId, subscription.status),
    stripePriceId: priceId,
    stripeSubscriptionId: subscription.id,
    stripeCustomerId: customerId,
    currentPeriodEnd: new Date(subscription.current_period_end * 1000),
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
  }
  console.log('Updating with data:', updateData)

  if (existingSubscription) {
    await prisma.subscription.update({
      where: { userId },
      data: updateData,
    })
  } else {
    // Create new subscription if none exists
    await prisma.subscription.create({
      data: {
        userId,
        ...updateData,
      },
    })
  }
}
