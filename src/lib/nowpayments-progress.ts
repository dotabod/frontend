import type { NowPaymentsInvoice } from '@prisma/client'
import { captureMessage } from '@sentry/nextjs'

import prisma from '@/lib/db'
import type { NowPaymentsPaymentStatus } from '@/lib/nowpayments'

const reportPartiallyPaid = (invoice: NowPaymentsInvoice, payment: NowPaymentsPaymentStatus) => {
  console.warn(
    `NOWPayments invoice ${invoice.nowPaymentsId} is partially paid: ${payment.actually_paid} of ${payment.pay_amount} ${payment.pay_currency}`,
  )
  captureMessage('NOWPayments payment is only partially paid', {
    extra: {
      actuallyPaid: payment.actually_paid,
      nowPaymentsId: invoice.nowPaymentsId,
      payAmount: payment.pay_amount,
      payCurrency: payment.pay_currency,
      stripeInvoiceId: invoice.stripeInvoiceId,
      userId: invoice.userId,
    },
    level: 'warning',
  })
}

export const recordNowPaymentsProgress = async function recordNowPaymentsProgress(
  invoice: NowPaymentsInvoice,
  payment: NowPaymentsPaymentStatus,
  onPartiallyPaid = reportPartiallyPaid,
): Promise<void> {
  const { count } = await prisma.nowPaymentsInvoice.updateMany({
    data: {
      actuallyPaid: payment.actually_paid,
      lastWebhookAt: new Date(),
      payAmount: payment.pay_amount,
      payCurrency: payment.pay_currency,
      paymentId: String(payment.payment_id),
      status: payment.payment_status,
    },
    where: {
      OR: [{ lastWebhookAt: null }, { status: { not: payment.payment_status } }],
      nowPaymentsId: invoice.nowPaymentsId,
      status: { not: 'finished' },
    },
  })

  if (count > 0 && payment.payment_status === 'partially_paid') {
    onPartiallyPaid(invoice, payment)
  }
}
