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
import { SubscriptionService } from './services/subscription-service'

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
    case 'customer.subscription.updated': {
      // For subscription.updated events, we need to check if this is a subscription
      // resuming from a paused state due to a gift expiration
      const subscription = event.data.object as Stripe.Subscription
      await handleSubscriptionEvent(subscription, tx)
      break
    }
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

      // If this is a new subscription checkout, update the subscription with the isNewSubscription flag
      if (
        session.mode === 'subscription' &&
        session.subscription &&
        session.metadata?.isNewSubscription === 'true'
      ) {
        try {
          // Update the subscription metadata to include the isNewSubscription flag
          await stripe.subscriptions.update(session.subscription as string, {
            metadata: {
              ...session.metadata,
              isNewSubscription: 'true',
            },
          })
          console.log(`Updated subscription ${session.subscription} with isNewSubscription flag`)

          // Check if the user has existing gift subscriptions and adjust the subscription accordingly
          if (session.metadata?.userId) {
            const subscriptionService = new SubscriptionService(tx)

            // If the user already has an active gift subscription, we need to pause the subscription
            // until the gift expires, even if there's no trial period
            if (session.metadata?.hasActiveGiftSubscription === 'true') {
              // Find the latest gift subscription expiration date
              const giftSubscription = await tx.subscription.findFirst({
                where: {
                  userId: session.metadata.userId,
                  isGift: true,
                  status: { in: ['ACTIVE', 'TRIALING'] },
                },
                orderBy: { currentPeriodEnd: 'desc' },
                select: { currentPeriodEnd: true },
              })

              if (giftSubscription?.currentPeriodEnd) {
                // Pause the subscription until the gift expires
                await subscriptionService.pauseForGift(
                  session.subscription as string,
                  giftSubscription.currentPeriodEnd,
                  {
                    pausedForGift: 'true',
                    createdWithActiveGift: 'true',
                  },
                )
                console.log(
                  `Paused subscription ${session.subscription} until gift expires on ${giftSubscription.currentPeriodEnd.toISOString()}`,
                )
              }
            } else {
              // If the user doesn't have an active gift subscription but gets one later,
              // we'll adjust the trial period
              await subscriptionService.adjustTrialForGifts(
                session.subscription as string,
                session.metadata.userId,
              )
            }
          }
        } catch (error) {
          console.error(`Failed to update subscription ${session.subscription} metadata:`, error)
        }
      }

      await handleCheckoutCompleted(session, tx)
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

  try {
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
      console.error(`Webhook processing failed for event ${event.id} (${event.type})`)
      // Return 200 to prevent Stripe from retrying, as we've already recorded the event
      // We'll handle the failure through our own monitoring and recovery process
      return res.status(200).json({ received: true, processed: false })
    }

    return res.status(200).json({ received: true, processed: true })
  } catch (error) {
    console.error(
      `Unhandled error in webhook handler for event ${event.id} (${event.type}):`,
      error,
    )
    // Return 200 to prevent Stripe from retrying, as this might be a persistent error
    // We'll handle the failure through our own monitoring and recovery process
    return res.status(200).json({ received: true, processed: false })
  }
}
