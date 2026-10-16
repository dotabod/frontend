import type { NowPaymentsInvoice } from '@prisma/client'
import { describe, expect, it, vi } from 'vitest'

import type { NowPaymentsPaymentStatus } from '@/lib/nowpayments'
import { reconcileNowPaymentsInvoices } from '@/lib/nowpayments-reconcile'

type Dependencies = NonNullable<Parameters<typeof reconcileNowPaymentsInvoices>[0]>

const now = new Date('2026-10-16T12:00:00.000Z')

const invoiceWith = (stripeInvoiceId: string, paymentId: string, status: string) => {
  const invoice: NowPaymentsInvoice = {
    actuallyPaid: null,
    createdAt: new Date('2026-10-15T00:00:00.000Z'),
    hostedInvoiceUrl: 'https://nowpayments.io/payment/?iid=np_inv_1',
    id: `row_${stripeInvoiceId}`,
    lastWebhookAt: new Date('2026-10-15T00:01:00.000Z'),
    metadata: {},
    nowPaymentsId: `np_${stripeInvoiceId}`,
    payAmount: 6.05,
    payCurrency: 'usdttrc20',
    paymentId,
    priceAmount: 6,
    priceCurrency: 'usd',
    status,
    stripeCustomerId: 'cus_1',
    stripeInvoiceId,
    updatedAt: new Date('2026-10-15T00:01:00.000Z'),
    userId: 'user_1',
  }
  return invoice
}

const paymentFor = (
  orderId: string,
  status: NowPaymentsPaymentStatus['payment_status'],
): NowPaymentsPaymentStatus => ({
  actually_paid: 6.05,
  created_at: '2026-10-15T00:05:00.000Z',
  order_description: 'Dotabod monthly subscription',
  order_id: orderId,
  outcome_amount: 5.9,
  outcome_currency: 'usdttrc20',
  pay_address: 'TXYZ',
  pay_amount: 6.05,
  pay_currency: 'usdttrc20',
  payment_id: 9999,
  payment_status: status,
  price_amount: 6,
  price_currency: 'usd',
  purchase_id: 1,
  updated_at: '2026-10-15T00:06:00.000Z',
})

const createFakes = (stale: NowPaymentsInvoice[], withoutPaymentId = 0) => {
  const fetchPayment = vi.fn<Dependencies['fetchPayment']>()
  const processConfirmed = vi.fn<Dependencies['processConfirmed']>().mockResolvedValue({
    processed: true,
    reason: 'processed',
    stripeInvoiceMarkedPaid: true,
    subscriptionCreated: true,
  })
  const recordProgress = vi.fn<Dependencies['recordProgress']>().mockResolvedValue()
  const reportFailure = vi.fn<Dependencies['reportFailure']>()
  const findStale = vi.fn<Dependencies['store']['findStale']>().mockResolvedValue(stale)
  const countWithoutPaymentId = vi
    .fn<Dependencies['store']['countWithoutPaymentId']>()
    .mockResolvedValue(withoutPaymentId)
  const dependencies: Dependencies = {
    fetchPayment,
    now: () => now,
    processConfirmed,
    recordProgress,
    reportFailure,
    store: { countWithoutPaymentId, findStale },
  }
  return {
    countWithoutPaymentId,
    dependencies,
    fetchPayment,
    findStale,
    processConfirmed,
    recordProgress,
    reportFailure,
  }
}

describe(reconcileNowPaymentsInvoices, () => {
  it('processes a payment NOWPayments reports as finished the way the IPN would', async () => {
    const invoice = invoiceWith('in_1', '9999', 'confirming')
    const payment = paymentFor('in_1', 'finished')
    const fakes = createFakes([invoice])
    fakes.fetchPayment.mockResolvedValue(payment)

    const summary = await reconcileNowPaymentsInvoices(fakes.dependencies)

    expect(fakes.fetchPayment).toHaveBeenCalledExactlyOnceWith('9999')
    expect(fakes.processConfirmed).toHaveBeenCalledExactlyOnceWith(invoice, payment)
    expect(fakes.recordProgress).not.toHaveBeenCalled()
    expect(summary).toStrictEqual({
      checked: 1,
      failed: 0,
      finished: 1,
      unchanged: 0,
      updated: 0,
      withoutPaymentId: 0,
    })
  })

  it('stores a status change without processing it', async () => {
    const invoice = invoiceWith('in_1', '9999', 'waiting')
    const payment = paymentFor('in_1', 'partially_paid')
    const fakes = createFakes([invoice])
    fakes.fetchPayment.mockResolvedValue(payment)

    const summary = await reconcileNowPaymentsInvoices(fakes.dependencies)

    expect(fakes.recordProgress).toHaveBeenCalledExactlyOnceWith(invoice, payment)
    expect(fakes.processConfirmed).not.toHaveBeenCalled()
    expect(summary.updated).toBe(1)
  })

  it('leaves an invoice alone when NOWPayments reports the status already stored', async () => {
    const fakes = createFakes([invoiceWith('in_1', '9999', 'confirming')])
    fakes.fetchPayment.mockResolvedValue(paymentFor('in_1', 'confirming'))

    const summary = await reconcileNowPaymentsInvoices(fakes.dependencies)

    expect(fakes.recordProgress).not.toHaveBeenCalled()
    expect(fakes.processConfirmed).not.toHaveBeenCalled()
    expect(summary.unchanged).toBe(1)
  })

  it('refuses a payment that belongs to a different order', async () => {
    const invoice = invoiceWith('in_1', '9999', 'waiting')
    const fakes = createFakes([invoice])
    fakes.fetchPayment.mockResolvedValue(paymentFor('in_other', 'finished'))

    const summary = await reconcileNowPaymentsInvoices(fakes.dependencies)

    expect(fakes.processConfirmed).not.toHaveBeenCalled()
    expect(fakes.reportFailure).toHaveBeenCalledExactlyOnceWith(invoice, expect.any(Error))
    expect(summary.failed).toBe(1)
  })

  it('keeps going when the lookup for one invoice fails', async () => {
    const broken = invoiceWith('in_broken', '1111', 'waiting')
    const healthy = invoiceWith('in_healthy', '2222', 'waiting')
    const fakes = createFakes([broken, healthy])
    fakes.fetchPayment.mockRejectedValueOnce(new Error('NOWPayments is down'))
    fakes.fetchPayment.mockResolvedValueOnce(paymentFor('in_healthy', 'finished'))

    const summary = await reconcileNowPaymentsInvoices(fakes.dependencies)

    expect(fakes.reportFailure).toHaveBeenCalledExactlyOnceWith(broken, expect.any(Error))
    expect(fakes.processConfirmed).toHaveBeenCalledExactlyOnceWith(
      healthy,
      paymentFor('in_healthy', 'finished'),
    )
    expect(summary).toMatchObject({ checked: 2, failed: 1, finished: 1 })
  })

  it('looks back 30 days for payments idle 15 minutes and counts invoices it cannot look up', async () => {
    const fakes = createFakes([], 19)

    const summary = await reconcileNowPaymentsInvoices(fakes.dependencies)

    expect(fakes.findStale).toHaveBeenCalledExactlyOnceWith(
      new Date('2026-10-16T11:45:00.000Z'),
      new Date('2026-09-16T12:00:00.000Z'),
      25,
    )
    expect(fakes.countWithoutPaymentId).toHaveBeenCalledExactlyOnceWith(
      new Date('2026-10-16T11:00:00.000Z'),
      new Date('2026-09-16T12:00:00.000Z'),
    )
    expect(fakes.fetchPayment).not.toHaveBeenCalled()
    expect(summary).toMatchObject({ checked: 0, withoutPaymentId: 19 })
  })
})
