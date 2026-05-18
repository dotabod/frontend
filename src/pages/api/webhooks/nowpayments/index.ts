import type { NextApiRequest, NextApiResponse } from 'next'
import prisma from '@/lib/db'
import {
  isNowPaymentsConfirmed,
  type NowPaymentsPaymentStatus,
  verifyNowPaymentsSignature,
} from '@/lib/nowpayments'
import { processConfirmedNowPaymentsPayment } from '@/lib/nowpayments-payment'

export const runtime = 'nodejs'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const body = req.body as Record<string, unknown>
    if (!body || typeof body !== 'object') {
      res.status(400).json({ error: 'Invalid webhook body' })
      return
    }

    const signature = req.headers['x-nowpayments-sig']
    const valid = verifyNowPaymentsSignature(body, signature)
    if (!valid) {
      if (process.env.VERCEL_ENV === 'production') {
        console.error('NOWPayments invalid signature', { signature })
        res.status(400).json({ error: 'Invalid signature' })
        return
      }
      console.warn('NOWPayments signature verification failed in development - continuing')
    }

    const payment = body as unknown as NowPaymentsPaymentStatus
    const stripeInvoiceId = payment.order_id
    if (!stripeInvoiceId) {
      res.status(200).json({ message: 'OK' })
      return
    }

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
        where: { nowPaymentsId: invoice.nowPaymentsId },
        data: {
          status: payment.payment_status,
          paymentId: String(payment.payment_id),
          payCurrency: payment.pay_currency,
          payAmount: payment.pay_amount,
          actuallyPaid: payment.actually_paid,
          lastWebhookAt: new Date(),
        },
      })
    }

    res.status(200).json({ message: 'OK' })
  } catch (error) {
    console.error('NOWPayments webhook processing failed:', error)
    res.status(500).json({ error: 'Webhook processing failed' })
  }
}
