import type { NextApiRequest, NextApiResponse } from 'next'
import prisma from '@/lib/db'
import { captureOrder } from '@/lib/paypal'
import { completeLifetimeOrder, syncPaypalSubscription } from '@/lib/paypal-subscriptions'

export const runtime = 'nodejs'

/**
 * PayPal redirects the buyer here after they approve. For subscriptions we sync
 * the current state so the dashboard reflects it immediately (the webhook is the
 * authoritative source). For lifetime orders we capture the payment.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const baseUrl = process.env.NEXTAUTH_URL || 'https://dotabod.com'
  const billingUrl = `${baseUrl}/dashboard/billing`
  const type = req.query.type as string

  try {
    if (type === 'subscription') {
      const subscriptionId = (req.query.subscription_id as string) || ''
      if (!subscriptionId) {
        return res.redirect(302, `${billingUrl}?paid=false`)
      }
      await syncPaypalSubscription(subscriptionId)
      return res.redirect(302, `${baseUrl}/dashboard?paid=true&paypal=true`)
    }

    if (type === 'order') {
      const orderId = (req.query.token as string) || ''
      if (!orderId) {
        return res.redirect(302, `${billingUrl}?paid=false`)
      }
      const order = await prisma.payPalOrder.findUnique({ where: { paypalOrderId: orderId } })
      if (!order) {
        return res.redirect(302, `${billingUrl}?paid=false`)
      }
      const capture = await captureOrder(orderId)
      if (capture.status !== 'COMPLETED') {
        return res.redirect(302, `${billingUrl}?paid=false`)
      }
      await completeLifetimeOrder(order, capture)
      return res.redirect(302, `${baseUrl}/dashboard?paid=true&paypal=true`)
    }

    return res.redirect(302, `${billingUrl}?paid=false`)
  } catch (error) {
    console.error('PayPal return handling failed:', error)
    return res.redirect(302, `${billingUrl}?paid=false`)
  }
}
