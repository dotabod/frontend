import type { NowPaymentsInvoice } from '@prisma/client'
import { captureException } from '@sentry/nextjs'

import prisma from '@/lib/db'
import { getNowPaymentsPayment, isNowPaymentsConfirmed } from '@/lib/nowpayments'
import type { NowPaymentsPaymentStatus } from '@/lib/nowpayments'
import { processConfirmedNowPaymentsPayment } from '@/lib/nowpayments-payment'
import type { NowPaymentsProcessResult } from '@/lib/nowpayments-payment'
import { recordNowPaymentsProgress } from '@/lib/nowpayments-progress'

const NON_FINAL_STATUSES = ['waiting', 'confirming', 'confirmed', 'sending', 'partially_paid']

const FIFTEEN_MINUTES_MS = 15 * 60 * 1000
const ONE_HOUR_MS = 60 * 60 * 1000
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000
const BATCH_SIZE = 25

interface NowPaymentsReconcileStore {
  countWithoutPaymentId: (createdBefore: Date, createdAfter: Date) => Promise<number>
  findStale: (staleBefore: Date, createdAfter: Date, limit: number) => Promise<NowPaymentsInvoice[]>
}

interface NowPaymentsReconcileDependencies {
  fetchPayment: (paymentId: string) => Promise<NowPaymentsPaymentStatus>
  now: () => Date
  processConfirmed: (
    invoice: NowPaymentsInvoice,
    payment: NowPaymentsPaymentStatus,
  ) => Promise<NowPaymentsProcessResult>
  recordProgress: (invoice: NowPaymentsInvoice, payment: NowPaymentsPaymentStatus) => Promise<void>
  reportFailure: (invoice: NowPaymentsInvoice, error: Error) => void
  store: NowPaymentsReconcileStore
}

interface NowPaymentsReconcileSummary {
  checked: number
  failed: number
  finished: number
  unchanged: number
  updated: number
  withoutPaymentId: number
}

const defaultDependencies: NowPaymentsReconcileDependencies = {
  fetchPayment: getNowPaymentsPayment,
  now: () => new Date(),
  processConfirmed: processConfirmedNowPaymentsPayment,
  recordProgress: recordNowPaymentsProgress,
  reportFailure: (invoice, error) => {
    console.error(`NOWPayments reconciliation failed for invoice ${invoice.nowPaymentsId}:`, error)
    captureException(error, {
      extra: { nowPaymentsId: invoice.nowPaymentsId, stripeInvoiceId: invoice.stripeInvoiceId },
    })
  },
  store: {
    countWithoutPaymentId: async (createdBefore, createdAfter) =>
      await prisma.nowPaymentsInvoice.count({
        where: {
          createdAt: { gt: createdAfter, lt: createdBefore },
          paymentId: null,
          status: { in: NON_FINAL_STATUSES },
        },
      }),
    findStale: async (staleBefore, createdAfter, limit) =>
      await prisma.nowPaymentsInvoice.findMany({
        orderBy: { updatedAt: 'asc' },
        take: limit,
        where: {
          createdAt: { gt: createdAfter },
          paymentId: { not: null },
          status: { in: NON_FINAL_STATUSES },
          updatedAt: { lt: staleBefore },
        },
      }),
  },
}

const reconcileInvoice = async function reconcileInvoice(
  invoice: NowPaymentsInvoice,
  dependencies: NowPaymentsReconcileDependencies,
): Promise<'finished' | 'unchanged' | 'updated'> {
  if (invoice.paymentId === null) {
    throw new Error(`NOWPayments invoice ${invoice.nowPaymentsId} has no payment id to look up`)
  }

  const payment = await dependencies.fetchPayment(invoice.paymentId)
  if (payment.order_id !== invoice.stripeInvoiceId) {
    throw new Error(
      `NOWPayments payment ${invoice.paymentId} belongs to order ${payment.order_id}, not ${invoice.stripeInvoiceId}`,
    )
  }

  if (isNowPaymentsConfirmed(payment.payment_status)) {
    await dependencies.processConfirmed(invoice, payment)
    return 'finished'
  }

  if (payment.payment_status === invoice.status) {
    return 'unchanged'
  }

  await dependencies.recordProgress(invoice, payment)
  return 'updated'
}

/**
 * Catches up on NOWPayments payments whose IPN never arrived or never finished. A payment that
 * has had no update for 15 minutes is read from the NOWPayments API; a `finished` one goes
 * through the same processing as the IPN, anything else is stored without ever moving a finished
 * row back. Only invoices that received at least one IPN can be looked up: the API reads a
 * payment by its id, and an invoice that never got an IPN has none, so those are only counted.
 */
export const reconcileNowPaymentsInvoices = async function reconcileNowPaymentsInvoices(
  dependencies: NowPaymentsReconcileDependencies = defaultDependencies,
): Promise<NowPaymentsReconcileSummary> {
  const now = dependencies.now().getTime()
  const createdAfter = new Date(now - THIRTY_DAYS_MS)
  const [stale, withoutPaymentId] = await Promise.all([
    dependencies.store.findStale(new Date(now - FIFTEEN_MINUTES_MS), createdAfter, BATCH_SIZE),
    dependencies.store.countWithoutPaymentId(new Date(now - ONE_HOUR_MS), createdAfter),
  ])

  const results = await Promise.allSettled(
    stale.map(async (invoice) => await reconcileInvoice(invoice, dependencies)),
  )

  const summary: NowPaymentsReconcileSummary = {
    checked: stale.length,
    failed: 0,
    finished: 0,
    unchanged: 0,
    updated: 0,
    withoutPaymentId,
  }
  for (const [index, result] of results.entries()) {
    if (result.status === 'fulfilled') {
      summary[result.value] += 1
    } else {
      summary.failed += 1
      const invoice = stale[index]
      if (invoice !== undefined) {
        dependencies.reportFailure(
          invoice,
          result.reason instanceof Error ? result.reason : new Error(String(result.reason)),
        )
      }
    }
  }

  console.log(JSON.stringify({ event: 'nowpayments_reconcile', ...summary }))
  return summary
}
