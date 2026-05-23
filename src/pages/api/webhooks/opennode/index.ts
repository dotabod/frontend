import type { NextApiRequest, NextApiResponse } from 'next'
import type { OpenNodeCharge } from 'opennode/dist/types/v1'
import prisma from '@/lib/db'
import { verifyOpenNodeWebhook } from '@/lib/opennode'
import { isOpenNodePaymentConfirmed, processConfirmedOpenNodePayment } from '@/lib/opennode-payment'

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
      }
      console.warn('Signature verification failed in development - continuing processing')
    }

    const charge = event || {}
    const { status } = charge
    const chargeId: string = charge.id
    // @ts-expect-error OpenNode charge metadata is not typed
    const invoiceId: string | undefined = charge.metadata?.stripe_invoice_id

    if (!chargeId || !invoiceId) {
      res.status(200).json({ message: 'OK' })
      return
    }

    console.log(`Processing OpenNode webhook: charge ${chargeId} status ${status}`)

    // Check if already processed (idempotency)
    const existingCharge = await prisma.openNodeCharge.findUnique({
      where: { openNodeChargeId: chargeId },
    })

    const existingMetadata = (existingCharge?.metadata as Record<string, unknown>) || {}
    const alreadyProcessedSuccessfully = existingMetadata.processedSuccessfully === true

    if (
      existingCharge?.lastWebhookAt &&
      existingCharge?.status === status &&
      (status !== 'paid' && status !== 'confirmed' ? true : alreadyProcessedSuccessfully)
    ) {
      console.log(
        `Charge ${chargeId} already processed at ${existingCharge.lastWebhookAt} with status ${status}`,
      )
      res.status(200).json({ message: 'Already processed' })
      return
    }

    // Handle payment confirmation
    if (isOpenNodePaymentConfirmed(status)) {
      try {
        if (!existingCharge) {
          throw new Error(`OpenNode charge ${chargeId} not found for invoice ${invoiceId}`)
        }

        await processConfirmedOpenNodePayment(existingCharge, status)
        console.log('✅ Successfully processed OpenNode payment')
      } catch (error) {
        console.error(`❌ Failed to process OpenNode payment ${chargeId}:`, error)
        // Return non-2xx so OpenNode retries the webhook for transient failures
        res.status(500).json({ error: 'Failed to process OpenNode payment' })
        return
      }
    } else {
      // For non-payment statuses, just update lastWebhookAt
      await prisma.openNodeCharge.updateMany({
        data: {
          lastWebhookAt: new Date(),
          status,
        },
        where: { openNodeChargeId: chargeId },
      })
    }

    res.status(200).json({ message: 'OK' })
    return
  } catch (error) {
    console.error('OpenNode webhook processing failed:', error)
    res.status(500).json({ error: 'Webhook processing failed' })
    return
  }
}
