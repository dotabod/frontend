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
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const signature = req.headers['stripe-signature'] as string
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  if (!signature || !webhookSecret) {
    return res.status(400).json({ error: 'Missing stripe webhook secret' })
  }

  let event: Stripe.Event

  try {
    const chunks: Uint8Array[] = []

    for await (const chunk of req) {
      chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk)
    }

    const rawBody = Buffer.concat(chunks).toString()

    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret)
  } catch (err) {
    console.error('Error verifying webhook:', err)
    return res.status(400).json({ error: 'Webhook error' })
  }

  if (relevantEvents.has(event.type)) {
    try {
      switch (event.type) {
        case 'customer.deleted': {
          const customer = event.data.object as Stripe.Customer
          await handleCustomerDeleted(customer)
          break
        }
        case 'customer.subscription.created':
        case 'customer.subscription.updated':
        case 'customer.subscription.deleted': {
          const subscription = event.data.object as Stripe.Subscription
          await updateSubscriptionInDatabase(subscription)
          break
        }
        case 'invoice.payment_succeeded': {
          const invoice = event.data.object as Stripe.Invoice
          if (invoice.subscription) {
            const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string)
            await updateSubscriptionInDatabase(subscription)
          }
          break
        }
        case 'invoice.payment_failed': {
          const invoice = event.data.object as Stripe.Invoice
          if (invoice.subscription) {
            const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string)
            await updateSubscriptionInDatabase(subscription)
          }
          break
        }
        case 'checkout.session.completed': {
          const session = event.data.object as Stripe.Checkout.Session

          if (session.mode === 'subscription') {
            // Handle regular subscription case
          } else if (session.mode === 'payment') {
            const lineItems = await stripe.checkout.sessions.listLineItems(session.id)
            const priceId = lineItems.data[0]?.price?.id

            // Get userId from session metadata
            const userId = session.metadata?.userId
            if (!userId) {
              console.error('No userId found in session metadata')
              return res.status(400).json({ error: 'No userId found' })
            }

            // Handle upgrade to lifetime case
            if (session.metadata?.isUpgradeToLifetime === 'true') {
              const previousSubscriptionId = session.metadata?.previousSubscriptionId

              if (previousSubscriptionId) {
                // Cancel the previous subscription immediately instead of waiting for period end
                try {
                  await stripe.subscriptions.cancel(previousSubscriptionId, {
                    invoice_now: false, // Don't generate a final invoice
                    prorate: true,
                  })
                } catch (error) {
                  console.error('Error canceling previous subscription:', error)
                }
              }
            }

            // Update subscription in database
            const subscriptionData = {
              status: 'active' as const,
              tier: getSubscriptionTier(priceId, 'active'),
              stripePriceId: priceId || '',
              stripeCustomerId: session.customer as string,
              currentPeriodEnd: new Date('2099-12-31'), // Lifetime access
              cancelAtPeriodEnd: false,
              stripeSubscriptionId: null, // Clear subscription ID for lifetime
            }

            await prisma.subscription.upsert({
              where: { userId },
              create: {
                userId,
                ...subscriptionData,
              },
              update: subscriptionData,
            })
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

  // Update using userId instead of stripeCustomerId
  await prisma.subscription.delete({
    where: { userId: existingSubscription.userId },
  })
}

async function updateSubscriptionInDatabase(subscription: Stripe.Subscription) {
  const priceId = subscription.items.data[0].price.id
  const customerId = subscription.customer as string

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
