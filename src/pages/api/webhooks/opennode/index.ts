import type { NextApiRequest, NextApiResponse } from 'next'
import type { OpenNodeCharge } from 'opennode/dist/types/v1'
import prisma from '@/lib/db'
import { verifyOpenNodeWebhook } from '@/lib/opennode'
import { stripe } from '@/lib/stripe-server'

export const runtime = 'nodejs'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // In Next.js, req.body is already parsed for application/json content-type
    const event: OpenNodeCharge = req.body

    if (!event || typeof event !== 'object') {
      console.error('Invalid webhook body', req.body)
      res.status(400).json({ error: 'Invalid webhook body' })
      return
    }

    // Verify OpenNode signature
    const isValid = await verifyOpenNodeWebhook(event)
    if (!isValid) {
      console.error('Invalid signature', event)

      // In development, log the signature verification failure but continue processing
      // This allows testing with OpenNode's webhook simulator
      if (process.env.VERCEL_ENV === 'production') {
        res.status(400).json({ error: 'Invalid signature' })
        return
      } else {
        console.warn('Signature verification failed in development - continuing processing')
      }
    }

    const charge = event || {}
    const status: string = charge.status
    const chargeId: string = charge.id
    // @ts-ignore OpenNode charge metadata is not typed
    const invoiceId: string | undefined = charge.metadata?.stripe_invoice_id

    if (!chargeId || !invoiceId) {
      res.status(200).json({ message: 'OK' })
      return
    }

    console.log(`Processing OpenNode webhook: charge ${chargeId} status ${status}`)

    // Update charge status in database
    await prisma.openNodeCharge.updateMany({
      where: { openNodeChargeId: chargeId },
      data: {
        status,
        lastWebhookAt: new Date(),
      },
    })

    // Handle payment confirmation
    if (status === 'paid' || status === 'confirmed') {
      try {
        // Mark Stripe invoice as paid out-of-band
        await stripe.invoices.pay(
          invoiceId,
          { paid_out_of_band: true },
          { idempotencyKey: chargeId },
        )

        console.log(`Marked Stripe invoice ${invoiceId} as paid via OpenNode charge ${chargeId}`)

        // The existing Stripe webhook handlers will process the invoice.paid event
        // and trigger subscription activation/renewal through the existing flow
      } catch (error) {
        console.error(`Failed to mark invoice ${invoiceId} as paid:`, error)
        // Don't return error - webhook was processed successfully
      }
    }

    res.status(200).json({ message: 'OK' })
    return
  } catch (error) {
    console.error('OpenNode webhook processing failed:', error)
    res.status(500).json({ error: 'Webhook processing failed' })
    return
  }
}
