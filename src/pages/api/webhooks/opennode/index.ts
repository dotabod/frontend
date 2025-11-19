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

    // Check if already processed (idempotency)
    const existingCharge = await prisma.openNodeCharge.findUnique({
      where: { openNodeChargeId: chargeId },
    })

    if (existingCharge?.lastWebhookAt && existingCharge?.status === status) {
      console.log(
        `Charge ${chargeId} already processed at ${existingCharge.lastWebhookAt} with status ${status}`,
      )
      res.status(200).json({ message: 'Already processed' })
      return
    }

    // Update charge status in database
    await prisma.openNodeCharge.updateMany({
      where: { openNodeChargeId: chargeId },
      data: {
        status,
      },
    })

    // Handle payment confirmation
    if (status === 'paid' || status === 'confirmed') {
      let stripeInvoiceMarkedPaid = false
      let subscriptionCreated = false

      try {
        // Mark Stripe invoice as paid out-of-band
        await stripe.invoices.pay(
          invoiceId,
          { paid_out_of_band: true },
          { idempotencyKey: chargeId },
        )

        stripeInvoiceMarkedPaid = true
        console.log(`✅ Marked Stripe invoice ${invoiceId} as paid via OpenNode charge ${chargeId}`)

        // Wait a moment for Stripe webhook to fire
        await new Promise((resolve) => setTimeout(resolve, 2000))

        // Check if subscription was created by Stripe webhook
        const subscription = await prisma.subscription.findFirst({
          where: {
            userId: existingCharge?.userId,
            stripeCustomerId: existingCharge?.stripeCustomerId,
          },
          orderBy: {
            createdAt: 'desc',
          },
        })

        subscriptionCreated = !!subscription

        // If Stripe webhook didn't create subscription, do it manually
        if (!subscriptionCreated) {
          console.log('⚠️ Stripe webhook did not create subscription, processing manually')

          // Import handleInvoiceEvent
          const { handleInvoiceEvent } = await import(
            '@/pages/api/stripe/handlers/invoice-events'
          )

          // Retrieve invoice with full details
          const invoice = await stripe.invoices.retrieve(invoiceId)

          // Process using transaction
          await prisma.$transaction(async (tx) => {
            await handleInvoiceEvent(invoice, tx)
          })

          subscriptionCreated = true
          console.log('✅ Subscription created manually')
        } else {
          console.log('✅ Subscription was created by Stripe webhook')
        }

        // Update charge record with success
        await prisma.openNodeCharge.update({
          where: { openNodeChargeId: chargeId },
          data: {
            lastWebhookAt: new Date(),
            metadata: {
              ...(existingCharge?.metadata as Record<string, unknown> || {}),
              processedSuccessfully: true,
              stripeInvoiceMarkedPaid,
              subscriptionCreated,
              processedAt: new Date().toISOString(),
            },
          },
        })

        console.log('✅ Successfully processed OpenNode payment')
      } catch (error) {
        console.error(`❌ Failed to process OpenNode payment ${chargeId}:`, error)

        // Store error for debugging
        await prisma.openNodeCharge.update({
          where: { openNodeChargeId: chargeId },
          data: {
            lastWebhookAt: new Date(),
            metadata: {
              ...(existingCharge?.metadata as Record<string, unknown> || {}),
              lastError: error instanceof Error ? error.message : String(error),
              errorStack: error instanceof Error ? error.stack : undefined,
              stripeInvoiceMarkedPaid,
              subscriptionCreated,
              failedAt: new Date().toISOString(),
            },
          },
        })

        // Don't return error - we've logged it and can recover manually
        console.log(
          '⚠️ Error logged in database. Use recovery script if needed: scripts/fix-opennode-payment.ts',
        )
      }
    } else {
      // For non-payment statuses, just update lastWebhookAt
      await prisma.openNodeCharge.update({
        where: { openNodeChargeId: chargeId },
        data: {
          lastWebhookAt: new Date(),
        },
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
