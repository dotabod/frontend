import type { OpenNodeCharge } from '@prisma/client'
import { beforeEach, describe, expect, it, vi } from 'vite-plus/test'

const mocks = vi.hoisted(() => {
  const tx = {}

  return {
    handleInvoiceEvent: vi.fn(),
    prisma: {
      $transaction: vi.fn(async (callback: (tx: unknown) => Promise<unknown>) => callback(tx)),
      openNodeCharge: {
        update: vi.fn(),
      },
      subscription: {
        findFirst: vi.fn(),
      },
    },
    stripe: {
      invoices: {
        pay: vi.fn(),
        retrieve: vi.fn(),
      },
    },
    tx,
  }
})

vi.mock('@/lib/db', () => ({
  default: mocks.prisma,
}))

vi.mock('@/lib/stripe-server', () => ({
  stripe: mocks.stripe,
}))

vi.mock('@/lib/stripe/handlers/invoice-events', () => ({
  handleInvoiceEvent: mocks.handleInvoiceEvent,
}))

import { processConfirmedOpenNodePayment } from '@/lib/opennode-payment'

const baseCharge: OpenNodeCharge = {
  amount: 99,
  createdAt: new Date('2026-04-29T20:00:00.000Z'),
  currency: 'USD',
  hostedCheckoutUrl: null,
  id: 'row_1',
  lastWebhookAt: null,
  metadata: {},
  openNodeChargeId: 'charge_1',
  status: 'processing',
  stripeCustomerId: 'cus_1',
  stripeInvoiceId: 'in_1',
  updatedAt: new Date('2026-04-29T20:00:00.000Z'),
  userId: 'user_1',
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
      customer: 'cus_1',
      id: 'in_1',
      metadata: {
        isCryptoPayment: 'true',
        paymentProvider: 'opennode',
        userId: 'user_1',
      },
      status: 'paid',
    }

    mocks.stripe.invoices.retrieve.mockResolvedValue({
      ...paidInvoice,
      status: 'open',
    })
    mocks.stripe.invoices.pay.mockResolvedValue(paidInvoice)

    const result = await processConfirmedOpenNodePayment(baseCharge, 'paid')

    expect(result.reason).toBe('processed')
    expect(mocks.stripe.invoices.pay).toHaveBeenCalledWith(
      'in_1',
      { paid_out_of_band: true },
      { idempotencyKey: 'charge_1' },
    )
    expect(mocks.handleInvoiceEvent).toHaveBeenCalledWith(paidInvoice, mocks.tx)
    expect(mocks.prisma.openNodeCharge.update).toHaveBeenLastCalledWith({
      data: {
        lastWebhookAt: expect.any(Date),
        metadata: expect.objectContaining({
          chargeId: 'charge_1',
          invoiceId: 'in_1',
          processedSuccessfully: true,
        }),
      },
      where: { openNodeChargeId: 'charge_1' },
    })
  })

  it('skips work that was already processed successfully', async () => {
    const processedCharge: OpenNodeCharge = {
      ...baseCharge,
      lastWebhookAt: new Date('2026-04-29T20:01:00.000Z'),
      metadata: { processedSuccessfully: true },
      status: 'paid',
    }

    const result = await processConfirmedOpenNodePayment(processedCharge, 'paid')

    expect(result.reason).toBe('already_processed')
    expect(mocks.stripe.invoices.pay).not.toHaveBeenCalled()
    expect(mocks.handleInvoiceEvent).not.toHaveBeenCalled()
    expect(mocks.prisma.openNodeCharge.update).not.toHaveBeenCalled()
  })

  it('handles an invoice that Stripe already marked paid', async () => {
    const paidInvoice = {
      customer: 'cus_1',
      id: 'in_1',
      metadata: {
        isCryptoPayment: 'true',
        paymentProvider: 'opennode',
        userId: 'user_1',
      },
      status: 'paid',
    }

    mocks.stripe.invoices.retrieve.mockResolvedValue(paidInvoice)

    const result = await processConfirmedOpenNodePayment(baseCharge, 'confirmed')

    expect(result.reason).toBe('processed')
    expect(mocks.stripe.invoices.pay).not.toHaveBeenCalled()
    expect(mocks.handleInvoiceEvent).toHaveBeenCalledWith(paidInvoice, mocks.tx)
  })
})
