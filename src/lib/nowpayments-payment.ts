import type { NowPaymentsInvoice } from '@prisma/client'
import prisma from '@/lib/db'
import { isNowPaymentsConfirmed, type NowPaymentsPaymentStatus } from '@/lib/nowpayments'
import { handleInvoiceEvent } from '@/lib/stripe/handlers/invoice-events'
import { stripe } from '@/lib/stripe-server'

export interface NowPaymentsProcessResult {
  processed: boolean
  reason: 'not_confirmed' | 'already_processed' | 'processed'
  stripeInvoiceMarkedPaid: boolean
  subscriptionCreated: boolean
}

function getMetadata(invoice: NowPaymentsInvoice): Record<string, unknown> {
  return invoice.metadata &&
    typeof invoice.metadata === 'object' &&
    !Array.isArray(invoice.metadata)
    ? (invoice.metadata as Record<string, unknown>)
    : {}
}

export async function processConfirmedNowPaymentsPayment(
  invoice: NowPaymentsInvoice,
  payment: NowPaymentsPaymentStatus,
): Promise<NowPaymentsProcessResult> {
  if (!isNowPaymentsConfirmed(payment.payment_status)) {
    return {
      processed: false,
      reason: 'not_confirmed',
      stripeInvoiceMarkedPaid: false,
      subscriptionCreated: false,
    }
  }

  const existingMetadata = getMetadata(invoice)

  if (
    invoice.lastWebhookAt &&
    invoice.status === payment.payment_status &&
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

  try {
    let stripeInvoice = await stripe.invoices.retrieve(invoice.stripeInvoiceId)

    if (stripeInvoice.status !== 'paid') {
      stripeInvoice = await stripe.invoices.pay(
        invoice.stripeInvoiceId,
        { paid_out_of_band: true },
        { idempotencyKey: `nowpayments-${invoice.nowPaymentsId}` },
      )
      stripeInvoiceMarkedPaid = true
      console.log(
        `Marked Stripe invoice ${invoice.stripeInvoiceId} as paid via NOWPayments invoice ${invoice.nowPaymentsId}`,
      )
    }

    if (stripeInvoice.status !== 'paid') {
      stripeInvoice = await stripe.invoices.retrieve(invoice.stripeInvoiceId)
    }

    if (stripeInvoice.status !== 'paid') {
      throw new Error(
        `Stripe invoice ${invoice.stripeInvoiceId} is ${stripeInvoice.status ?? 'unknown'} after NOWPayments confirmation`,
      )
    }

    const handled = await prisma.$transaction(async (tx) => handleInvoiceEvent(stripeInvoice, tx))
    if (!handled) {
      throw new Error(`Invoice handler returned false for ${invoice.stripeInvoiceId}`)
    }

    subscriptionCreated = Boolean(
      await prisma.subscription.findFirst({
        orderBy: { createdAt: 'desc' },
        select: { id: true },
        where: {
          NOT: { status: 'CANCELED' },
          stripeCustomerId: invoice.stripeCustomerId,
          userId: invoice.userId,
        },
      }),
    )

    await prisma.nowPaymentsInvoice.update({
      data: {
        actuallyPaid: payment.actually_paid,
        lastWebhookAt: new Date(),
        metadata: {
          ...existingMetadata,
          invoiceId: invoice.stripeInvoiceId,
          nowPaymentsId: invoice.nowPaymentsId,
          paymentId: String(payment.payment_id),
          processedAt: new Date().toISOString(),
          processedSuccessfully: true,
          stripeInvoiceMarkedPaid,
          subscriptionCreated,
        },
        payAmount: payment.pay_amount,
        payCurrency: payment.pay_currency,
        paymentId: String(payment.payment_id),
        status: payment.payment_status,
      },
      where: { nowPaymentsId: invoice.nowPaymentsId },
    })

    return {
      processed: true,
      reason: 'processed',
      stripeInvoiceMarkedPaid,
      subscriptionCreated,
    }
  } catch (error) {
    await prisma.nowPaymentsInvoice.update({
      data: {
        metadata: {
          ...existingMetadata,
          errorStack: error instanceof Error ? error.stack : undefined,
          failedAt: new Date().toISOString(),
          invoiceId: invoice.stripeInvoiceId,
          lastError: error instanceof Error ? error.message : String(error),
          nowPaymentsId: invoice.nowPaymentsId,
          paymentId: String(payment.payment_id),
          processedSuccessfully: false,
          stripeInvoiceMarkedPaid,
          subscriptionCreated,
        },
      },
      where: { nowPaymentsId: invoice.nowPaymentsId },
    })

    throw error
  }
}
