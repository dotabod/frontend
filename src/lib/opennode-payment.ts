import type { OpenNodeCharge } from '@prisma/client'
import prisma from '@/lib/db'
import { handleInvoiceEvent } from '@/lib/stripe/handlers/invoice-events'
import { stripe } from '@/lib/stripe-server'

const OPENNODE_CONFIRMED_STATUSES = new Set(['paid', 'confirmed'])

export interface OpenNodePaymentProcessResult {
  processed: boolean
  reason: 'not_confirmed' | 'already_processed' | 'processed'
  stripeInvoiceMarkedPaid: boolean
  subscriptionCreated: boolean
}

export function isOpenNodePaymentConfirmed(status: string | null | undefined): boolean {
  return Boolean(status) && OPENNODE_CONFIRMED_STATUSES.has(status)
}

function getMetadata(charge: OpenNodeCharge): Record<string, unknown> {
  return charge.metadata && typeof charge.metadata === 'object' && !Array.isArray(charge.metadata)
    ? (charge.metadata as Record<string, unknown>)
    : {}
}

export async function processConfirmedOpenNodePayment(
  charge: OpenNodeCharge,
  status = charge.status,
): Promise<OpenNodePaymentProcessResult> {
  if (!isOpenNodePaymentConfirmed(status)) {
    return {
      processed: false,
      reason: 'not_confirmed',
      stripeInvoiceMarkedPaid: false,
      subscriptionCreated: false,
    }
  }

  const existingMetadata = getMetadata(charge)

  if (
    charge.lastWebhookAt &&
    charge.status === status &&
    existingMetadata.processedSuccessfully === true
  ) {
    return {
      processed: false,
      reason: 'already_processed',
      stripeInvoiceMarkedPaid: false,
      subscriptionCreated: false,
    }
  }

  let stripeInvoiceMarkedPaid = false
  let subscriptionCreated = false

  await prisma.openNodeCharge.update({
    data: { status },
    where: { openNodeChargeId: charge.openNodeChargeId },
  })

  try {
    let invoice = await stripe.invoices.retrieve(charge.stripeInvoiceId)

    if (invoice.status !== 'paid') {
      invoice = await stripe.invoices.pay(
        charge.stripeInvoiceId,
        { paid_out_of_band: true },
        { idempotencyKey: charge.openNodeChargeId },
      )
      stripeInvoiceMarkedPaid = true
      console.log(
        `Marked Stripe invoice ${charge.stripeInvoiceId} as paid via OpenNode charge ${charge.openNodeChargeId}`,
      )
    }

    if (invoice.status !== 'paid') {
      invoice = await stripe.invoices.retrieve(charge.stripeInvoiceId)
    }

    if (invoice.status !== 'paid') {
      throw new Error(
        `Stripe invoice ${charge.stripeInvoiceId} is ${invoice.status ?? 'unknown'} after OpenNode confirmation`,
      )
    }

    const handled = await prisma.$transaction(async (tx) => handleInvoiceEvent(invoice, tx))
    if (!handled) {
      throw new Error(`Invoice handler returned false for ${charge.stripeInvoiceId}`)
    }

    subscriptionCreated = Boolean(
      await prisma.subscription.findFirst({
        orderBy: { createdAt: 'desc' },
        select: { id: true },
        where: {
          NOT: { status: 'CANCELED' },
          stripeCustomerId: charge.stripeCustomerId,
          userId: charge.userId,
        },
      }),
    )

    await prisma.openNodeCharge.update({
      data: {
        lastWebhookAt: new Date(),
        metadata: {
          ...existingMetadata,
          chargeId: charge.openNodeChargeId,
          invoiceId: charge.stripeInvoiceId,
          processedAt: new Date().toISOString(),
          processedSuccessfully: true,
          stripeInvoiceMarkedPaid,
          subscriptionCreated,
        },
      },
      where: { openNodeChargeId: charge.openNodeChargeId },
    })

    return {
      processed: true,
      reason: 'processed',
      stripeInvoiceMarkedPaid,
      subscriptionCreated,
    }
  } catch (error) {
    await prisma.openNodeCharge.update({
      data: {
        metadata: {
          ...existingMetadata,
          chargeId: charge.openNodeChargeId,
          errorStack: error instanceof Error ? error.stack : undefined,
          failedAt: new Date().toISOString(),
          invoiceId: charge.stripeInvoiceId,
          lastError: error instanceof Error ? error.message : String(error),
          processedSuccessfully: false,
          stripeInvoiceMarkedPaid,
          subscriptionCreated,
        },
      },
      where: { openNodeChargeId: charge.openNodeChargeId },
    })

    throw error
  }
}
