import { stripe } from '@/lib/stripe-server'
import type { NextApiRequest, NextApiResponse } from 'next'
import { withTransaction } from './utils/transaction'
import { processEventIdempotently } from './utils/idempotency'
import { handleSubscriptionEvent, handleSubscriptionDeleted } from './handlers/subscription-events'
import { handleInvoiceEvent } from './handlers/invoice-events'
import { handleCheckoutCompleted } from './handlers/checkout-events'
import { handleChargeSucceeded, handleChargeRefunded } from './handlers/charge-events'
import { handleCustomerDeleted } from './handlers/customer-events'
import type Stripe from 'stripe'
import type { Prisma } from '@prisma/client'

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
  'charge.refunded',
])

/**
 * Verifies the webhook signature and constructs the event
 * @param req The incoming request
 * @returns The verified event or an error
 */
async function verifyWebhook(
  req: NextApiRequest,
): Promise<{ event?: Stripe.Event; error?: string }> {
  const signature = req.headers['stripe-signature'] as string
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  if (!signature || !webhookSecret) {
    return { error: 'Webhook configuration error' }
  }

  try {
    const rawBody = await getRawBody(req)
    const event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret)
    return { event }
  } catch (err) {
    console.error('Webhook verification failed:', err)
    return { error: 'Webhook verification failed' }
  }
}

/**
 * Processes a webhook event based on its type
 * @param event The Stripe event
 * @param tx The transaction client
 */
async function processWebhookEvent(
  event: Stripe.Event,
  tx: Prisma.TransactionClient,
): Promise<void> {
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
    case 'checkout.session.completed': {
      // For checkout.session.completed events, we need to ensure that gift subscriptions
      // are properly processed and regular subscriptions are updated accordingly
      const session = event.data.object as Stripe.Checkout.Session
      await handleCheckoutCompleted(session, tx)

      // After processing a checkout session that might involve gifts,
      // check if we need to update any regular subscriptions for the user
      if (session.metadata?.isGift === 'true' && session.metadata?.recipientUserId) {
        // Import the SubscriptionService to handle updating regular subscriptions
        const { SubscriptionService } = await import('./services/subscription-service')
        const subscriptionService = new SubscriptionService(tx)

        // Find the user's regular subscription and update it based on all gift subscriptions
        const userId = session.metadata.recipientUserId
        const regularSubscription = await tx.subscription.findFirst({
          where: {
            userId,
            status: { in: ['ACTIVE', 'TRIALING'] },
            isGift: false,
            stripeSubscriptionId: { not: null },
          },
        })

        if (regularSubscription?.stripeSubscriptionId) {
          // Find all active gift subscriptions for this user
          const giftSubscriptions = await tx.subscription.findMany({
            where: {
              userId,
              status: { in: ['ACTIVE', 'TRIALING'] },
              isGift: true,
            },
            orderBy: {
              currentPeriodEnd: 'desc',
            },
          })

          // Find the latest gift expiration date
          let latestGiftExpirationDate: Date | null = null
          for (const gift of giftSubscriptions) {
            if (
              gift.currentPeriodEnd &&
              (!latestGiftExpirationDate || gift.currentPeriodEnd > latestGiftExpirationDate)
            ) {
              latestGiftExpirationDate = gift.currentPeriodEnd
            }
          }

          // If we found a valid gift expiration date, update the regular subscription
          if (latestGiftExpirationDate) {
            await subscriptionService.pauseForGift(
              regularSubscription.stripeSubscriptionId,
              latestGiftExpirationDate,
              {
                originalRenewalDate: regularSubscription.currentPeriodEnd?.toISOString() || '',
                giftCheckoutSessionId: session.id,
              },
            )
          }
        }
      }
      break
    }
    case 'charge.succeeded':
      await handleChargeSucceeded(event.data.object as Stripe.Charge, tx)
      break
    case 'charge.refunded':
      await handleChargeRefunded(event.data.object as Stripe.Charge, tx)
      break
  }
}

/**
 * Gets the raw body from the request
 * @param req The incoming request
 * @returns The raw body as a string
 */
async function getRawBody(req: NextApiRequest): Promise<string> {
  const chunks: Uint8Array[] = []
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk)
  }
  return Buffer.concat(chunks).toString()
}

/**
 * Main webhook handler
 * @param req The incoming request
 * @param res The outgoing response
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { event, error } = await verifyWebhook(req)
  if (error) {
    return res.status(400).json({ error })
  }

  if (!event || !relevantEvents.has(event.type)) {
    return res.status(200).json({ received: true })
  }

  const result = await withTransaction(async (tx) => {
    return processEventIdempotently(
      event.id,
      event.type,
      async (tx) => {
        await processWebhookEvent(event, tx)
      },
      tx,
    )
  })

  if (result === null) {
    return res.status(500).json({ error: 'Webhook processing failed' })
  }

  return res.status(200).json({ received: true })
}
