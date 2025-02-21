import prisma from '@/lib/db'
import { stripe } from '@/lib/stripe-server'
import type { NextApiResponse } from 'next'
import type { NextApiRequest } from 'next'
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
  'invoice.payment_succeeded',
  'invoice.payment_failed',
])

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
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
            const subscription = await stripe.subscriptions.retrieve(
              invoice.subscription as string
            )
            await updateSubscriptionInDatabase(subscription)
          }
          break
        }
        case 'invoice.payment_failed': {
          const invoice = event.data.object as Stripe.Invoice
          if (invoice.subscription) {
            const subscription = await stripe.subscriptions.retrieve(
              invoice.subscription as string
            )
            await updateSubscriptionInDatabase(subscription)
          }
          break
        }
        default:
          throw new Error(`Unhandled relevant event: ${event.type}`)
      }
    } catch (error) {
      console.error('Error processing webhook event:', error)
      return res.status(500).json({ error: 'Webhook handler failed' })
    }
  }

  return res.status(200).json({ received: true })
}

async function updateSubscriptionInDatabase(subscription: Stripe.Subscription) {
  const priceId = subscription.items.data[0].price.id
  const customerId = subscription.customer as string

  // Map price IDs to tiers
  const tier = priceId.includes('starter') ? 'starter' : 'pro'

  await prisma.subscription.update({
    where: { stripeCustomerId: customerId },
    data: {
      status: subscription.status,
      tier: subscription.status === 'active' ? tier : 'free',
      stripePriceId: priceId,
      stripeSubscriptionId: subscription.id,
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
    },
  })
}
