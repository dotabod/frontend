import type { NowPaymentsInvoice } from '@prisma/client'
import prisma from '@/lib/db'
import { isNowPaymentsConfirmed, type NowPaymentsPaymentStatus } from '@/lib/nowpayments'
import { handleInvoiceEvent } from '@/lib/stripe/handlers/invoice-events'
import { stripe } from '@/lib/stripe-server'

export type NowPaymentsProcessResult = {
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

    subscriptionCreated = !!(await prisma.subscription.findFirst({
      where: {
        userId: invoice.userId,
        stripeCustomerId: invoice.stripeCustomerId,
        NOT: { status: 'CANCELED' },
      },
      orderBy: { createdAt: 'desc' },
      select: { id: true },
    }))

    await prisma.nowPaymentsInvoice.update({
      where: { nowPaymentsId: invoice.nowPaymentsId },
      data: {
        status: payment.payment_status,
        paymentId: String(payment.payment_id),
        payCurrency: payment.pay_currency,
        payAmount: payment.pay_amount,
        actuallyPaid: payment.actually_paid,
        lastWebhookAt: new Date(),
        metadata: {
          ...existingMetadata,
          processedSuccessfully: true,
          stripeInvoiceMarkedPaid,
          subscriptionCreated,
          invoiceId: invoice.stripeInvoiceId,
          nowPaymentsId: invoice.nowPaymentsId,
          paymentId: String(payment.payment_id),
          processedAt: new Date().toISOString(),
        },
      },
    })

    return {
      processed: true,
      reason: 'processed',
      stripeInvoiceMarkedPaid,
      subscriptionCreated,
    }
  } catch (error) {
    await prisma.nowPaymentsInvoice.update({
      where: { nowPaymentsId: invoice.nowPaymentsId },
      data: {
        metadata: {
          ...existingMetadata,
          processedSuccessfully: false,
          lastError: error instanceof Error ? error.message : String(error),
          errorStack: error instanceof Error ? error.stack : undefined,
          stripeInvoiceMarkedPaid,
          subscriptionCreated,
          invoiceId: invoice.stripeInvoiceId,
          nowPaymentsId: invoice.nowPaymentsId,
          paymentId: String(payment.payment_id),
          failedAt: new Date().toISOString(),
        },
      },
    })

    throw error
  }
}
