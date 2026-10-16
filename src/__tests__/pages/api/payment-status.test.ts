import type { NowPaymentsInvoice, Prisma } from '@prisma/client'
import type { NextApiRequest, NextApiResponse } from 'next'
import { createMocks } from 'node-mocks-http'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import handler from '@/pages/api/payment-status'

interface NowPaymentsRow {
  createdAt: Date
  nowPaymentsId: string
  priceAmount: number
  priceCurrency: string
  status: NowPaymentsInvoice['status']
  stripeInvoiceId: string
}

const mocks = vi.hoisted(() => {
  const openNodeCharge = {
    amount: 131_136,
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

  return {
    getOpenNodeChargeStatus: vi.fn(),
    getServerSession: vi.fn(),
    openNodeCharge,
    prisma: {
      nowPaymentsInvoice: {
        findUnique:
          vi.fn<
            (args: Prisma.NowPaymentsInvoiceFindUniqueArgs) => Promise<NowPaymentsRow | null>
          >(),
      },
      openNodeCharge: {
        findUnique: vi.fn(),
        update: vi.fn(),
      },
      subscription: {
        findFirst:
          vi.fn<(args: Prisma.SubscriptionFindFirstArgs) => Promise<{ id: string } | null>>(),
      },
    },
    processConfirmedOpenNodePayment: vi.fn(),
    stripe: {
      invoices: {
        retrieve: vi.fn(),
      },
    },
  }
})

vi.mock('@/lib/api/get-server-session', () => ({
  getServerSession: mocks.getServerSession,
}))

vi.mock('@/lib/auth', () => ({
  authOptions: {},
}))

vi.mock('@/lib/db', () => ({
  default: mocks.prisma,
}))

vi.mock('@/lib/opennode', () => ({
  getOpenNodeChargeStatus: mocks.getOpenNodeChargeStatus,
}))

vi.mock('@/lib/opennode-payment', () => ({
  isOpenNodePaymentConfirmed: (status: string) => ['paid', 'confirmed'].includes(status),
  processConfirmedOpenNodePayment: mocks.processConfirmedOpenNodePayment,
}))

vi.mock('@/lib/stripe-server', () => ({
  stripe: mocks.stripe,
}))

const invoice = {
  amount_due: 9900,
  currency: 'usd',
  customer: 'cus_1',
  customer_email: 'user@example.com',
  id: 'in_1',
  metadata: { userId: 'user_1' },
  number: 'F3F91300-0012',
  status: 'open',
  total: 9900,
}

describe('payment-status API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getServerSession.mockResolvedValue({ user: { id: 'user_1' } })
    mocks.stripe.invoices.retrieve
      .mockResolvedValueOnce(invoice)
      .mockResolvedValueOnce({ ...invoice, status: 'paid' })
    mocks.prisma.openNodeCharge.findUnique.mockResolvedValue(mocks.openNodeCharge)
    mocks.prisma.openNodeCharge.update.mockResolvedValue({
      ...mocks.openNodeCharge,
      status: 'paid',
    })
    mocks.getOpenNodeChargeStatus.mockResolvedValue({ id: 'charge_1', status: 'paid' })
    mocks.processConfirmedOpenNodePayment.mockResolvedValue({
      processed: true,
      reason: 'processed',
      stripeInvoiceMarkedPaid: true,
      subscriptionCreated: true,
    })
  })

  it('activates the subscription when polling discovers a confirmed OpenNode payment', async () => {
    const { req, res } = createMocks({
      method: 'GET',
      query: { invoiceId: 'in_1' },
    })

    await handler(req, res)

    expect(res.statusCode).toBe(200)
    expect(mocks.prisma.openNodeCharge.update).toHaveBeenCalledWith({
      data: {
        status: 'paid',
        updatedAt: expect.any(Date),
      },
      where: { id: 'row_1' },
    })
    expect(mocks.processConfirmedOpenNodePayment).toHaveBeenCalledWith(
      {
        ...mocks.openNodeCharge,
        status: 'paid',
      },
      'paid',
    )
    expect(res._getJSONData()).toMatchObject({
      amount: 99,
      chargeId: 'charge_1',
      currency: 'usd',
      invoice: {
        id: 'in_1',
        status: 'paid',
      },
      invoiceId: 'in_1',
      status: 'paid',
    })
  })

  it('reports a NOWPayments invoice instead of answering 404 when there is no OpenNode charge', async () => {
    mocks.prisma.openNodeCharge.findUnique.mockResolvedValue(null)
    mocks.prisma.nowPaymentsInvoice.findUnique.mockResolvedValue({
      createdAt: new Date('2026-10-14T20:00:00.000Z'),
      nowPaymentsId: 'np_inv_1',
      priceAmount: 99,
      priceCurrency: 'usd',
      status: 'finished',
      stripeInvoiceId: 'in_1',
    })
    mocks.prisma.subscription.findFirst.mockResolvedValue({ id: 'sub_1' })
    const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
      method: 'GET',
      query: { invoiceId: 'in_1' },
    })

    await handler(req, res)

    expect(res.statusCode).toBe(200)
    expect(mocks.getOpenNodeChargeStatus).not.toHaveBeenCalled()
    expect(res._getJSONData()).toMatchObject({
      chargeId: 'np_inv_1',
      invoiceId: 'in_1',
      status: 'finished',
      statusInfo: { type: 'success' },
    })
  })
})
