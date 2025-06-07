import { stripe } from '@/lib/stripe-server'
import type { NextApiRequest } from 'next'
import type Stripe from 'stripe'
import { debugLog } from '../utils/debugLog'

export async function verifyWebhook(
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

async function getRawBody(req: NextApiRequest): Promise<string> {
  const chunks: Uint8Array[] = []
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk)
  }
  return Buffer.concat(chunks).toString()
}
