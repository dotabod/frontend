import type { NextApiRequest, NextApiResponse } from 'next'
import prisma from '@/lib/db'
import {
  isNowPaymentsConfirmed,
  isNowPaymentsPaymentStatus,
  verifyNowPaymentsSignature,
} from '@/lib/nowpayments'
import { processConfirmedNowPaymentsPayment } from '@/lib/nowpayments-payment'

export const runtime = 'nodejs'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    res.status(405).json({ error: 'Method not allowed' })
    return
  }
  try {
    const body = req.body as Record<string, unknown>
    if (!body || typeof body !== 'object') {
      res.status(400).json({ error: 'Invalid webhook body' })
      return
    }

    const signature = req.headers['x-nowpayments-sig']
    const valid = verifyNowPaymentsSignature(body, signature)
    if (!valid) {
      // Only local dev (NODE_ENV=development) may bypass for the simulator —
      // Vercel preview deployments are publicly reachable and must reject.
      if (process.env.NODE_ENV !== 'development') {
        console.error('NOWPayments invalid signature', { signature })
        res.status(400).json({ error: 'Invalid signature' })
        return
      }
      console.warn('NOWPayments signature verification failed in development - continuing')
    }

    if (!isNowPaymentsPaymentStatus(body)) {
      console.warn('NOWPayments webhook missing required fields', {
        hasOrderId: typeof body.order_id === 'string',
        hasPaymentId: typeof body.payment_id === 'number',
        status: body.payment_status,
      })
      res.status(200).json({ message: 'OK' })
      return
    }

    const payment = body
    const stripeInvoiceId = payment.order_id

    const invoice = await prisma.nowPaymentsInvoice.findUnique({
      where: { stripeInvoiceId },
    })
    if (!invoice) {
      console.warn(`NOWPayments webhook for unknown invoice ${stripeInvoiceId}`)
      res.status(200).json({ message: 'OK' })
      return
    }

    const confirmed = isNowPaymentsConfirmed(payment.payment_status)

    if (invoice.lastWebhookAt && invoice.status === payment.payment_status && !confirmed) {
      res.status(200).json({ message: 'Already processed' })
      return
    }

    if (confirmed) {
      try {
        await processConfirmedNowPaymentsPayment(invoice, payment)
        console.log('✅ Processed NOWPayments payment', invoice.nowPaymentsId)
      } catch (error) {
        console.error('❌ Failed to process NOWPayments payment:', error)
        res.status(500).json({ error: 'Failed to process NOWPayments payment' })
        return
      }
    } else {
      await prisma.nowPaymentsInvoice.update({
        data: {
          actuallyPaid: payment.actually_paid,
          lastWebhookAt: new Date(),
          payAmount: payment.pay_amount,
          payCurrency: payment.pay_currency,
          paymentId: String(payment.payment_id),
          status: payment.payment_status,
        },
        where: { nowPaymentsId: invoice.nowPaymentsId },
      })
    }

    res.status(200).json({ message: 'OK' })
  } catch (error) {
    console.error('NOWPayments webhook processing failed:', error)
    res.status(500).json({ error: 'Webhook processing failed' })
  }
}
