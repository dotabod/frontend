import type { NowPaymentsInvoice } from '@prisma/client'
import { describe, expect, it, vi } from 'vitest'

import type { NowPaymentsPaymentStatus } from '@/lib/nowpayments'
import { recordNowPaymentsProgress } from '@/lib/nowpayments-progress'

type Dependencies = NonNullable<Parameters<typeof recordNowPaymentsProgress>[2]>

const invoice: NowPaymentsInvoice = {
  actuallyPaid: null,
  createdAt: new Date('2026-10-15T00:00:00.000Z'),
  hostedInvoiceUrl: 'https://nowpayments.io/payment/?iid=np_inv_1',
  id: 'row_1',
  lastWebhookAt: null,
  metadata: {},
  nowPaymentsId: 'np_inv_1',
  payAmount: null,
  payCurrency: null,
  paymentId: null,
  priceAmount: 6,
  priceCurrency: 'usd',
  status: 'waiting',
  stripeCustomerId: 'cus_1',
  stripeInvoiceId: 'in_1',
  updatedAt: new Date('2026-10-15T00:00:00.000Z'),
  userId: 'user_1',
}

const paymentWithStatus = (status: NowPaymentsPaymentStatus['payment_status']) => {
  const payment: NowPaymentsPaymentStatus = {
    actually_paid: 3,
    created_at: '2026-10-15T00:05:00.000Z',
    order_description: 'Dotabod monthly subscription',
    order_id: 'in_1',
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
  }
  return payment
}

const createDependencies = (saved: boolean) => {
  const saveUnlessFinished = vi
    .fn<Dependencies['store']['saveUnlessFinished']>()
    .mockResolvedValue(saved)
  const partiallyPaid = vi.fn<Dependencies['alerts']['partiallyPaid']>()
  const dependencies: Dependencies = {
    alerts: { partiallyPaid },
    store: { saveUnlessFinished },
  }
  return { dependencies, partiallyPaid, saveUnlessFinished }
}

describe(recordNowPaymentsProgress, () => {
  it('stores a status that is not finished without alerting', async () => {
    const fakes = createDependencies(true)
    const payment = paymentWithStatus('confirming')

    await recordNowPaymentsProgress(invoice, payment, fakes.dependencies)

    expect(fakes.saveUnlessFinished).toHaveBeenCalledExactlyOnceWith(invoice, payment)
    expect(fakes.partiallyPaid).not.toHaveBeenCalled()
  })

  it('alerts when a payment first becomes partially paid', async () => {
    const fakes = createDependencies(true)
    const payment = paymentWithStatus('partially_paid')

    await recordNowPaymentsProgress(invoice, payment, fakes.dependencies)

    expect(fakes.partiallyPaid).toHaveBeenCalledExactlyOnceWith(invoice, payment)
  })

  it('does not alert again for a payment that was already partially paid', async () => {
    const fakes = createDependencies(true)

    await recordNowPaymentsProgress(
      { ...invoice, status: 'partially_paid' },
      paymentWithStatus('partially_paid'),
      fakes.dependencies,
    )

    expect(fakes.partiallyPaid).not.toHaveBeenCalled()
  })

  it('leaves a finished payment alone and does not alert about a late status', async () => {
    const fakes = createDependencies(false)

    await recordNowPaymentsProgress(
      { ...invoice, status: 'finished' },
      paymentWithStatus('partially_paid'),
      fakes.dependencies,
    )

    expect(fakes.saveUnlessFinished).toHaveBeenCalledOnce()
    expect(fakes.partiallyPaid).not.toHaveBeenCalled()
  })
})
