import { stripe } from '@/lib/stripe-server'
import type { Prisma } from '@prisma/client'
import { SubscriptionStatus } from '@prisma/client'
import type { NextApiRequest, NextApiResponse } from 'next'
import type Stripe from 'stripe'
import { handleChargeRefunded, handleChargeSucceeded } from './handlers/charge-events'
import { handleCheckoutCompleted } from './handlers/checkout-events'
import { handleCustomerDeleted } from './handlers/customer-events'
import { handleInvoiceEvent } from './handlers/invoice-events'
import { handleSubscriptionDeleted, handleSubscriptionEvent } from './handlers/subscription-events'
import { debugLog } from './utils/debugLog'
import { processEventIdempotently } from './utils/idempotency'
import { withTransaction } from './utils/transaction'

export const config = {
  api: {
    bodyParser: false,
  },
}

// Use the custom type for our set of relevant events
const relevantEvents = new Set<Stripe.Event.Type>([
  'customer.subscription.created',
  'customer.subscription.updated',
  'customer.subscription.deleted',
  'customer.deleted',
  'invoice.payment_succeeded',
  'invoice.payment_failed',
  'invoice.marked_uncollectible',
  'invoice.overdue',
  'invoice.paid', // Added for Boomfi crypto payments
  'checkout.session.completed',
  'charge.succeeded',
  'charge.refunded',
])

/**
 * Helper function to find a user by Stripe customer ID
 */
async function findUserByCustomerId(
  customerId: string,
  tx: Prisma.TransactionClient,
): Promise<{ id: string } | null> {
  // Find a subscription with this customer ID
  const subscription = await tx.subscription.findFirst({
    where: { stripeCustomerId: customerId },
    select: { userId: true },
  })

  if (subscription) {
    return { id: subscription.userId }
  }

  return null
}

/**
 * Verifies the webhook signature and constructs the event
 * @param req The incoming request
 * @returns The verified event or an error
 */
async function verifyWebhook(
  req: NextApiRequest,
): Promise<{ event?: Stripe.Event; error?: string }> {
  debugLog('Entering verifyWebhook')
  const signature = req.headers['stripe-signature'] as string
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  if (!signature || !webhookSecret) {
    debugLog('Missing signature or webhook secret')
    return { error: 'Webhook configuration error' }
  }

  try {
    debugLog('Getting raw body')
    const rawBody = await getRawBody(req)
    debugLog('Constructing webhook event')
    const event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret)
    debugLog('Webhook event constructed successfully', { eventId: event.id })
    debugLog('Exiting verifyWebhook successfully')
    return { event }
  } catch (err) {
    console.error('Webhook verification failed:', err)
    debugLog('Webhook verification failed', { error: err })
    debugLog('Exiting verifyWebhook with error')
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
  debugLog(`Entering processWebhookEvent for event ${event.id} (${event.type})`)
  // Type guard to ensure event.type is one of our supported event types
  if (!relevantEvents.has(event.type)) {
    debugLog(`Event ${event.id} (${event.type}) is not relevant, skipping.`)
    return
  }

  // Now TypeScript knows event.type is one of our supported types
  debugLog(`Processing relevant event ${event.id} (${event.type})`)
  switch (event.type) {
    case 'customer.deleted': {
      debugLog(`Calling handleCustomerDeleted for event ${event.id}`)
      await handleCustomerDeleted(event.data.object, tx)
      debugLog(`Finished handleCustomerDeleted for event ${event.id}`)
      break
    }
    case 'customer.subscription.created':
    case 'customer.subscription.updated': {
      const subscription = event.data.object
      debugLog(`Processing ${event.type} for subscription ${subscription.id}`)
      // Handle switching from crypto to regular payments
      if (event.type === 'customer.subscription.created') {
        debugLog('Subscription created event, checking for active crypto subscriptions')
        const user = await findUserByCustomerId(subscription.customer as string, tx)
        debugLog('Found user by customer ID', { userId: user?.id })

        if (user) {
          debugLog(`Checking active crypto subscriptions for user ${user.id}`)
          const activeCryptoSubscriptions = await tx.subscription.findMany({
            where: {
              userId: user.id,
              NOT: {
                status: SubscriptionStatus.CANCELED,
              },
              metadata: {
                path: ['isCryptoPayment'],
                equals: 'true',
              },
            },
          })
          debugLog(`Found ${activeCryptoSubscriptions.length} active crypto subscriptions`)

          // Cancel any crypto subscriptions and their associated invoices
          for (const cryptoSub of activeCryptoSubscriptions) {
            debugLog(
              `Canceling crypto subscription ${cryptoSub.id} due to new regular subscription`,
            )

            // Cancel any pending invoices
            if (cryptoSub.metadata) {
              const metadata = (cryptoSub.metadata as Record<string, unknown>) || {}
              const renewalInvoiceId = metadata.renewalInvoiceId as string

              if (renewalInvoiceId) {
                try {
                  debugLog(
                    `Voiding crypto invoice ${renewalInvoiceId} due to switch to regular payments`,
                  )
                  await stripe.invoices.voidInvoice(renewalInvoiceId)
                  debugLog(`Successfully voided invoice ${renewalInvoiceId}`)
                } catch (invoiceError) {
                  console.error(`Failed to void invoice ${renewalInvoiceId}:`, invoiceError)
                  debugLog(`Failed to void invoice ${renewalInvoiceId}`, { error: invoiceError })
                }
              }
            }

            // Mark the subscription as canceled
            debugLog(`Updating subscription ${cryptoSub.id} status to CANCELED`)
            await tx.subscription.update({
              where: { id: cryptoSub.id },
              data: {
                status: SubscriptionStatus.CANCELED,
                cancelAtPeriodEnd: true,
                updatedAt: new Date(),
                metadata: {
                  ...(typeof cryptoSub.metadata === 'object' ? cryptoSub.metadata : {}),
                  switchedToRegular: 'true',
                  switchedAt: new Date().toISOString(),
                },
              },
            })
            debugLog(`Successfully marked crypto subscription ${cryptoSub.id} as canceled`)
          }
        } else {
          debugLog('No user found for customer ID, skipping crypto check')
        }
      }

      debugLog(`Calling handleSubscriptionEvent for subscription ${subscription.id}`)
      await handleSubscriptionEvent(subscription, tx)
      debugLog(`Finished handleSubscriptionEvent for subscription ${subscription.id}`)
      break
    }
    case 'customer.subscription.deleted': {
      const subscription = event.data.object
      debugLog(`Calling handleSubscriptionDeleted for subscription ${subscription.id}`)
      await handleSubscriptionDeleted(event.data.object, tx)
      debugLog(`Finished handleSubscriptionDeleted for subscription ${subscription.id}`)
      break
    }
    case 'invoice.payment_succeeded':
    case 'invoice.payment_failed':
    case 'invoice.marked_uncollectible':
    case 'invoice.overdue':
    case 'invoice.paid': {
      const invoice = event.data.object
      debugLog(`Calling handleInvoiceEvent for invoice ${invoice.id} (event: ${event.type})`)
      await handleInvoiceEvent(event.data.object, tx)
      debugLog(`Finished handleInvoiceEvent for invoice ${invoice.id} (event: ${event.type})`)
      break
    }
    case 'checkout.session.completed': {
      const session = event.data.object
      debugLog(`Calling handleCheckoutCompleted for session ${session.id}`)
      await handleCheckoutCompleted(session, tx)
      debugLog(`Finished handleCheckoutCompleted for session ${session.id}`)
      break
    }
    case 'charge.succeeded': {
      const chargeSucceeded = event.data.object
      debugLog(`Calling handleChargeSucceeded for charge ${chargeSucceeded.id}`)
      await handleChargeSucceeded(event.data.object, tx)
      debugLog(`Finished handleChargeSucceeded for charge ${chargeSucceeded.id}`)
      break
    }
    case 'charge.refunded': {
      const chargeRefunded = event.data.object
      debugLog(`Calling handleChargeRefunded for charge ${chargeRefunded.id}`)
      await handleChargeRefunded(event.data.object, tx)
      debugLog(`Finished handleChargeRefunded for charge ${chargeRefunded.id}`)
      break
    }
  }
  debugLog(`Exiting processWebhookEvent for event ${event.id} (${event.type})`)
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
    debugLog('Webhook handler received non-POST request')
    return res.status(405).json({ error: 'Method not allowed' })
  }
  debugLog('Webhook handler received POST request')

  debugLog('Verifying webhook signature...')
  const { event, error } = await verifyWebhook(req)
  debugLog('Webhook verification completed.', { eventId: event?.id, error })

  if (error) {
    debugLog('Webhook verification failed:', error)
    return res.status(400).json({ error })
  }

  debugLog('Checking if event is relevant...', { eventId: event?.id, eventType: event?.type })
  if (!event || !relevantEvents.has(event.type)) {
    debugLog('Event is not relevant or event is null. Responding 200 OK.', {
      eventId: event?.id,
      eventType: event?.type,
    })
    return res.status(200).json({ received: true })
  }
  debugLog('Event is relevant.', { eventId: event.id, eventType: event.type })

  try {
    debugLog(`Starting processing for event ${event.id} (${event.type})`)
    const result = await withTransaction(async (tx) => {
      debugLog(`Inside transaction for event ${event.id} (${event.type})`)
      return processEventIdempotently(
        event.id,
        event.type,
        async (tx) => {
          debugLog(`Executing processWebhookEvent for event ${event.id} (${event.type})`)
          await processWebhookEvent(event, tx)
          debugLog(`Finished processWebhookEvent for event ${event.id} (${event.type})`)
        },
        tx,
      )
    })

    debugLog(`Idempotent processing result for event ${event.id} (${event.type}):`, result)

    if (result === null) {
      console.error(`Webhook processing failed for event ${event.id} (${event.type})`)
      debugLog(`Webhook processing marked as failed for event ${event.id}, responding 200 OK.`)
      // Return 200 to prevent Stripe from retrying, as we've already recorded the event
      // We'll handle the failure through our own monitoring and recovery process
      return res.status(200).json({ received: true, processed: false })
    }

    // Handle the case where the event was already processed
    if (typeof result === 'object' && result.skipped) {
      debugLog(
        `Event ${event.id} (${event.type}) was already processed at ${result.processedAt}. Responding 200 OK.`,
      )
      return res.status(200).json({
        received: true,
        processed: true,
        skipped: true,
        processedAt: result.processedAt,
      })
    }

    debugLog(`Successfully processed event ${event.id} (${event.type}). Responding 200 OK.`)
    return res.status(200).json({ received: true, processed: true })
  } catch (error) {
    console.error(
      `Unhandled error in webhook handler for event ${event.id} (${event.type}):`,
      error,
    )
    // Return 200 to prevent Stripe from retrying, as this might be a persistent error
    // We'll handle the failure through our own monitoring and recovery process
    debugLog(`Responding 200 OK after unhandled error for event ${event.id} (${event.type})`)
    return res.status(200).json({ received: true, processed: false })
  }
}
