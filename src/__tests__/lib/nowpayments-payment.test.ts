import type { NowPaymentsInvoice } from '@prisma/client'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

vi.stubEnv('NOWPAYMENTS_API_KEY', 'test-api-key')
vi.stubEnv('NOWPAYMENTS_IPN_SECRET', 'test-ipn-secret')

const mocks = vi.hoisted(() => {
  const tx = {}
  return {
    tx,
    prisma: {
      nowPaymentsInvoice: { update: vi.fn() },
      subscription: { findFirst: vi.fn() },
      $transaction: vi.fn(async (callback: (tx: unknown) => Promise<unknown>) => callback(tx)),
    },
    stripe: {
      invoices: {
        retrieve: vi.fn(),
        pay: vi.fn(),
      },
    },
    handleInvoiceEvent: vi.fn(),
  }
})

vi.mock('@/lib/db', () => ({ default: mocks.prisma }))
vi.mock('@/lib/stripe-server', () => ({ stripe: mocks.stripe }))
vi.mock('@/pages/api/stripe/handlers/invoice-events', () => ({
  handleInvoiceEvent: mocks.handleInvoiceEvent,
}))

type NowPaymentsPaymentStatus = import('@/lib/nowpayments').NowPaymentsPaymentStatus
let processConfirmedNowPaymentsPayment: typeof import('@/lib/nowpayments-payment').processConfirmedNowPaymentsPayment

beforeAll(async () => {
  ;({ processConfirmedNowPaymentsPayment } = await import('@/lib/nowpayments-payment'))
})

const baseInvoice: NowPaymentsInvoice = {
  id: 'row_1',
  nowPaymentsId: 'np_inv_1',
  stripeInvoiceId: 'in_1',
  stripeCustomerId: 'cus_1',
  userId: 'user_1',
  priceAmount: 13,
  priceCurrency: 'usd',
  payCurrency: null,
  payAmount: null,
  actuallyPaid: null,
  paymentId: null,
  status: 'waiting',
  hostedInvoiceUrl: 'https://nowpayments.io/payment/?iid=np_inv_1',
  metadata: {},
  createdAt: new Date('2026-05-18T00:00:00.000Z'),
  updatedAt: new Date('2026-05-18T00:00:00.000Z'),
  lastWebhookAt: null,
}

const basePayment: NowPaymentsPaymentStatus = {
  payment_id: 9999,
  invoice_id: 1234,
  payment_status: 'finished',
  pay_address: 'TXYZ',
  price_amount: 13,
  price_currency: 'usd',
  pay_amount: 13.05,
  actually_paid: 13.05,
  pay_currency: 'usdttrc20',
  order_id: 'in_1',
}

describe('processConfirmedNowPaymentsPayment', () => {
  beforeEach(() => {
    vi.stubEnv('NOWPAYMENTS_API_KEY', 'test-api-key')
    vi.stubEnv('NOWPAYMENTS_IPN_SECRET', 'test-ipn-secret')
    mocks.prisma.$transaction.mockImplementation(async (cb) => cb(mocks.tx))
    mocks.handleInvoiceEvent.mockResolvedValue(true)
    mocks.prisma.subscription.findFirst.mockResolvedValue({ id: 'sub_1' })
  })

  it('marks an open Stripe invoice paid and runs the invoice handler', async () => {
    const paidInvoice = {
      id: 'in_1',
      status: 'paid',
      customer: 'cus_1',
      metadata: { isCryptoPayment: 'true', paymentProvider: 'nowpayments' },
    }
    mocks.stripe.invoices.retrieve.mockResolvedValue({ ...paidInvoice, status: 'open' })
    mocks.stripe.invoices.pay.mockResolvedValue(paidInvoice)

    const result = await processConfirmedNowPaymentsPayment(baseInvoice, basePayment)

    expect(result.reason).toBe('processed')
    expect(result.stripeInvoiceMarkedPaid).toBe(true)
    expect(result.subscriptionCreated).toBe(true)
    expect(mocks.stripe.invoices.pay).toHaveBeenCalledWith(
      'in_1',
      { paid_out_of_band: true },
      { idempotencyKey: 'nowpayments-np_inv_1' },
    )
    expect(mocks.handleInvoiceEvent).toHaveBeenCalledWith(paidInvoice, mocks.tx)
    expect(mocks.prisma.nowPaymentsInvoice.update).toHaveBeenCalledTimes(1)
    expect(mocks.prisma.nowPaymentsInvoice.update).toHaveBeenCalledWith({
      where: { nowPaymentsId: 'np_inv_1' },
      data: expect.objectContaining({
        status: 'finished',
        paymentId: '9999',
        payCurrency: 'usdttrc20',
        lastWebhookAt: expect.any(Date),
        metadata: expect.objectContaining({
          processedSuccessfully: true,
          invoiceId: 'in_1',
          nowPaymentsId: 'np_inv_1',
          paymentId: '9999',
        }),
      }),
    })
  })

  it('does not flip status to finished when Stripe work fails', async () => {
    mocks.stripe.invoices.retrieve.mockResolvedValue({ id: 'in_1', status: 'open' })
    mocks.stripe.invoices.pay.mockResolvedValue({ id: 'in_1', status: 'paid' })
    mocks.handleInvoiceEvent.mockResolvedValue(false)

    await expect(processConfirmedNowPaymentsPayment(baseInvoice, basePayment)).rejects.toThrow()

    // Failure update should NOT set status — it must only record metadata so the
    // row remains at its prior status for the next webhook to retry against.
    const failureCall = mocks.prisma.nowPaymentsInvoice.update.mock.calls.at(-1)?.[0]
    expect(failureCall?.data?.status).toBeUndefined()
    expect(failureCall?.data?.metadata).toMatchObject({ processedSuccessfully: false })
  })

  it('skips work that was already processed successfully', async () => {
    const processed: NowPaymentsInvoice = {
      ...baseInvoice,
      status: 'finished',
      lastWebhookAt: new Date('2026-05-18T01:00:00.000Z'),
      metadata: { processedSuccessfully: true },
    }
    const result = await processConfirmedNowPaymentsPayment(processed, basePayment)

    expect(result.reason).toBe('already_processed')
    expect(mocks.stripe.invoices.pay).not.toHaveBeenCalled()
    expect(mocks.handleInvoiceEvent).not.toHaveBeenCalled()
    expect(mocks.prisma.nowPaymentsInvoice.update).not.toHaveBeenCalled()
  })

  it('skips an unconfirmed status without touching Stripe', async () => {
    const result = await processConfirmedNowPaymentsPayment(baseInvoice, {
      ...basePayment,
      payment_status: 'waiting',
    })
    expect(result.reason).toBe('not_confirmed')
    expect(mocks.stripe.invoices.retrieve).not.toHaveBeenCalled()
  })

  it('handles an invoice that Stripe already marked paid', async () => {
    const paidInvoice = {
      id: 'in_1',
      status: 'paid',
      customer: 'cus_1',
      metadata: { isCryptoPayment: 'true', paymentProvider: 'nowpayments' },
    }
    mocks.stripe.invoices.retrieve.mockResolvedValue(paidInvoice)

    const result = await processConfirmedNowPaymentsPayment(baseInvoice, basePayment)

    expect(result.reason).toBe('processed')
    expect(result.stripeInvoiceMarkedPaid).toBe(false)
    expect(mocks.stripe.invoices.pay).not.toHaveBeenCalled()
    expect(mocks.handleInvoiceEvent).toHaveBeenCalledWith(paidInvoice, mocks.tx)
  })

  it('writes failure metadata and rethrows when the invoice handler fails', async () => {
    mocks.stripe.invoices.retrieve.mockResolvedValue({ id: 'in_1', status: 'open' })
    mocks.stripe.invoices.pay.mockResolvedValue({ id: 'in_1', status: 'paid' })
    mocks.handleInvoiceEvent.mockResolvedValue(false)

    await expect(processConfirmedNowPaymentsPayment(baseInvoice, basePayment)).rejects.toThrow(
      /Invoice handler returned false/,
    )

    expect(mocks.prisma.nowPaymentsInvoice.update).toHaveBeenLastCalledWith({
      where: { nowPaymentsId: 'np_inv_1' },
      data: {
        metadata: expect.objectContaining({
          processedSuccessfully: false,
          lastError: expect.stringContaining('Invoice handler returned false'),
        }),
      },
    })
  })
})
