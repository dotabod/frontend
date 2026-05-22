import { SubscriptionStatus } from '@prisma/client'
import type { NextApiRequest, NextApiResponse } from 'next'
import prisma from '@/lib/db'
import { captureOrder, verifyWebhookSignature } from '@/lib/paypal'
import {
  completeLifetimeOrder,
  markPaypalSubscriptionInactive,
  syncPaypalSubscription,
} from '@/lib/paypal-subscriptions'

export const config = {
  api: {
    bodyParser: false,
  },
}

export const runtime = 'nodejs'

async function getRawBody(req: NextApiRequest): Promise<string> {
  const chunks: Uint8Array[] = []
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk)
  }
  return Buffer.concat(chunks).toString()
}

interface PayPalWebhookEvent {
  event_type: string
  resource?: {
    id?: string
    custom_id?: string
    billing_agreement_id?: string
    supplementary_data?: { related_ids?: { order_id?: string } }
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const rawBody = await getRawBody(req)
    const valid = await verifyWebhookSignature(req.headers, rawBody)
    if (!valid) {
      console.error('PayPal webhook signature verification failed')
      return res.status(400).json({ error: 'Invalid signature' })
    }

    const event = JSON.parse(rawBody) as PayPalWebhookEvent
    const resource = event.resource ?? {}

    switch (event.event_type) {
      // Subscription lifecycle — resource.id is the PayPal subscription id.
      case 'BILLING.SUBSCRIPTION.ACTIVATED':
      case 'BILLING.SUBSCRIPTION.UPDATED':
      case 'PAYMENT.SALE.COMPLETED': {
        // For recurring payments the subscription id is on billing_agreement_id.
        const subscriptionId = resource.billing_agreement_id || resource.id
        if (subscriptionId) {
          await syncPaypalSubscription(subscriptionId)
        }
        break
      }
      case 'BILLING.SUBSCRIPTION.CANCELLED':
      case 'BILLING.SUBSCRIPTION.EXPIRED': {
        if (resource.id) {
          await markPaypalSubscriptionInactive(resource.id, SubscriptionStatus.CANCELED)
        }
        break
      }
      case 'BILLING.SUBSCRIPTION.SUSPENDED':
      case 'BILLING.SUBSCRIPTION.PAYMENT.FAILED': {
        if (resource.id) {
          await markPaypalSubscriptionInactive(resource.id, SubscriptionStatus.PAST_DUE)
        }
        break
      }
      // Lifetime order approved — backup capture in case the buyer closed the
      // tab before the return route ran. Skipped if already processed there.
      case 'CHECKOUT.ORDER.APPROVED': {
        const orderId = resource.id
        if (orderId) {
          const order = await prisma.payPalOrder.findUnique({
            where: { paypalOrderId: orderId },
          })
          const orderMetadata = (order?.metadata as Record<string, unknown>) || {}
          if (order && orderMetadata.processedSuccessfully !== true) {
            const capture = await captureOrder(order.paypalOrderId)
            if (capture.status === 'COMPLETED') {
              await completeLifetimeOrder(order, capture)
            }
          }
        }
        break
      }
      default:
        break
    }

    return res.status(200).json({ message: 'OK' })
  } catch (error) {
    console.error('PayPal webhook processing failed:', error)
    return res.status(500).json({ error: 'Webhook processing failed' })
  }
}
