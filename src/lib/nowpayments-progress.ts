import type { NowPaymentsInvoice } from '@prisma/client'
import { captureMessage } from '@sentry/nextjs'

import prisma from '@/lib/db'
import type { NowPaymentsPaymentStatus } from '@/lib/nowpayments'

interface NowPaymentsProgressStore {
  saveUnlessFinished: (
    invoice: NowPaymentsInvoice,
    payment: NowPaymentsPaymentStatus,
  ) => Promise<boolean>
}

interface NowPaymentsProgressAlerts {
  partiallyPaid: (invoice: NowPaymentsInvoice, payment: NowPaymentsPaymentStatus) => void
}

interface NowPaymentsProgressDependencies {
  alerts: NowPaymentsProgressAlerts
  store: NowPaymentsProgressStore
}

const defaultDependencies: NowPaymentsProgressDependencies = {
  alerts: {
    partiallyPaid: (invoice, payment) => {
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
    },
  },
  store: {
    // The finished check is part of the write, so an IPN that is still in flight when the
    // Payment finishes cannot move the row back to an earlier status.
    saveUnlessFinished: async (invoice, payment) => {
      const { count } = await prisma.nowPaymentsInvoice.updateMany({
        data: {
          actuallyPaid: payment.actually_paid,
          lastWebhookAt: new Date(),
          payAmount: payment.pay_amount,
          payCurrency: payment.pay_currency,
          paymentId: String(payment.payment_id),
          status: payment.payment_status,
        },
        where: { nowPaymentsId: invoice.nowPaymentsId, status: { not: 'finished' } },
      })
      return count > 0
    },
  },
}

/**
 * Stores a status that is not `finished` (the IPN handler and the reconciliation job share it).
 * A row that already finished is left alone, and moving into `partially_paid` raises an alert
 * once, since nothing else tells us a buyer sent too little.
 */
export const recordNowPaymentsProgress = async function recordNowPaymentsProgress(
  invoice: NowPaymentsInvoice,
  payment: NowPaymentsPaymentStatus,
  dependencies: NowPaymentsProgressDependencies = defaultDependencies,
): Promise<void> {
  const saved = await dependencies.store.saveUnlessFinished(invoice, payment)
  if (!saved) {
    console.log(
      `Ignoring ${payment.payment_status} for NOWPayments invoice ${invoice.nowPaymentsId}: it already finished`,
    )
    return
  }

  if (payment.payment_status === 'partially_paid' && invoice.status !== 'partially_paid') {
    dependencies.alerts.partiallyPaid(invoice, payment)
  }
}
