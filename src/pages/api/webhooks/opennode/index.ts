import prisma from '@/lib/db';
import { verifyOpenNodeWebhook } from '@/lib/opennode';
import { stripe } from '@/lib/stripe-server';
import { NextApiRequest, NextApiResponse } from 'next';
import type { OpenNodeCharge } from 'opennode/dist/types/v1';

export const runtime = 'nodejs'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const rawBody = await req.body
    let event: OpenNodeCharge

    try {
      event = JSON.parse(rawBody)
    } catch {
      return res.status(400).json({ error: 'Invalid JSON' })
    }

    // Verify OpenNode signature
    const isValid = await verifyOpenNodeWebhook(event)
    if (!isValid) {
      return res.status(400).json({ error: 'Invalid signature' })
    }

    const charge =  event || {}
    const status: string = charge.status
    const chargeId: string = charge.id
    const invoiceId: string | undefined = charge.metadata?.stripe_invoice_id

    if (!chargeId || !invoiceId) {
      return res.status(200).json({ message: 'OK' })
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

    return res.status(200).json({ message: 'OK' })
  } catch (error) {
    console.error('OpenNode webhook processing failed:', error)
    return res.status(500).json({ error: 'Webhook processing failed' })
  }
}
