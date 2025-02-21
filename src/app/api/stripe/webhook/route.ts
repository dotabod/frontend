import prisma from '@/lib/prisma'
import { stripe } from '@/lib/stripe-server'
import { headers } from 'next/headers'
import type Stripe from 'stripe'

const relevantEvents = new Set([
  'customer.subscription.created',
  'customer.subscription.updated',
  'customer.subscription.deleted',
])

export async function POST(req: Request) {
  const body = await req.text()
  const signature = headers().get('Stripe-Signature') as string
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  let event: Stripe.Event

  try {
    if (!signature || !webhookSecret)
      throw new Error('Missing stripe webhook secret')
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (err) {
    console.error('Error verifying webhook:', err)
    return new Response(
      `Webhook Error: ${err instanceof Error ? err.message : 'Unknown Error'}`,
      { status: 400 }
    )
  }

  if (relevantEvents.has(event.type)) {
    try {
      switch (event.type) {
        case 'customer.subscription.created':
        case 'customer.subscription.updated':
        case 'customer.subscription.deleted':
          const subscription = event.data.object as Stripe.Subscription
          await updateSubscriptionInDatabase(subscription)
          break
        default:
          throw new Error(`Unhandled relevant event: ${event.type}`)
      }
    } catch (error) {
      console.error('Error processing webhook event:', error)
      return new Response('Webhook handler failed', { status: 500 })
    }
  }

  return new Response(JSON.stringify({ received: true }))
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
