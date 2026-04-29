import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => {
  const tx = {}

  return {
    tx,
    prisma: {
      openNodeCharge: {
        update: vi.fn(),
      },
      subscription: {
        findFirst: vi.fn(),
      },
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

vi.mock('@/lib/db', () => ({
  default: mocks.prisma,
}))

vi.mock('@/lib/stripe-server', () => ({
  stripe: mocks.stripe,
}))

vi.mock('@/pages/api/stripe/handlers/invoice-events', () => ({
  handleInvoiceEvent: mocks.handleInvoiceEvent,
}))

import { processConfirmedOpenNodePayment } from '@/lib/opennode-payment'

const baseCharge = {
  id: 'row_1',
  openNodeChargeId: 'charge_1',
  stripeInvoiceId: 'in_1',
  stripeCustomerId: 'cus_1',
  userId: 'user_1',
  amount: 99,
  currency: 'USD',
  status: 'processing',
  hostedCheckoutUrl: null,
  metadata: {},
  createdAt: new Date('2026-04-29T20:00:00.000Z'),
  updatedAt: new Date('2026-04-29T20:00:00.000Z'),
  lastWebhookAt: null,
}

describe('processConfirmedOpenNodePayment', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.prisma.$transaction.mockImplementation(async (callback) => callback(mocks.tx))
    mocks.handleInvoiceEvent.mockResolvedValue(true)
    mocks.prisma.subscription.findFirst.mockResolvedValue({ id: 'sub_1' })
  })

  it('marks an open Stripe invoice paid and runs the invoice handler', async () => {
    const paidInvoice = {
      id: 'in_1',
      status: 'paid',
      customer: 'cus_1',
      metadata: {
        isCryptoPayment: 'true',
        paymentProvider: 'opennode',
        userId: 'user_1',
      },
    }

    mocks.stripe.invoices.retrieve.mockResolvedValue({
      ...paidInvoice,
      status: 'open',
    })
    mocks.stripe.invoices.pay.mockResolvedValue(paidInvoice)

    const result = await processConfirmedOpenNodePayment(baseCharge as any, 'paid')

    expect(result.reason).toBe('processed')
    expect(mocks.stripe.invoices.pay).toHaveBeenCalledWith(
      'in_1',
      { paid_out_of_band: true },
      { idempotencyKey: 'charge_1' },
    )
    expect(mocks.handleInvoiceEvent).toHaveBeenCalledWith(paidInvoice, mocks.tx)
    expect(mocks.prisma.openNodeCharge.update).toHaveBeenLastCalledWith({
      where: { openNodeChargeId: 'charge_1' },
      data: {
        lastWebhookAt: expect.any(Date),
        metadata: expect.objectContaining({
          processedSuccessfully: true,
          invoiceId: 'in_1',
          chargeId: 'charge_1',
        }),
      },
    })
  })

  it('skips work that was already processed successfully', async () => {
    const result = await processConfirmedOpenNodePayment(
      {
        ...baseCharge,
        status: 'paid',
        lastWebhookAt: new Date('2026-04-29T20:01:00.000Z'),
        metadata: { processedSuccessfully: true },
      } as any,
      'paid',
    )

    expect(result.reason).toBe('already_processed')
    expect(mocks.stripe.invoices.pay).not.toHaveBeenCalled()
    expect(mocks.handleInvoiceEvent).not.toHaveBeenCalled()
    expect(mocks.prisma.openNodeCharge.update).not.toHaveBeenCalled()
  })

  it('handles an invoice that Stripe already marked paid', async () => {
    const paidInvoice = {
      id: 'in_1',
      status: 'paid',
      customer: 'cus_1',
      metadata: {
        isCryptoPayment: 'true',
        paymentProvider: 'opennode',
        userId: 'user_1',
      },
    }

    mocks.stripe.invoices.retrieve.mockResolvedValue(paidInvoice)

    const result = await processConfirmedOpenNodePayment(baseCharge as any, 'confirmed')

    expect(result.reason).toBe('processed')
    expect(mocks.stripe.invoices.pay).not.toHaveBeenCalled()
    expect(mocks.handleInvoiceEvent).toHaveBeenCalledWith(paidInvoice, mocks.tx)
  })
})
