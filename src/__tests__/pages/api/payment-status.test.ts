import { createMocks } from 'node-mocks-http'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => {
  const openNodeCharge = {
    id: 'row_1',
    openNodeChargeId: 'charge_1',
    stripeInvoiceId: 'in_1',
    stripeCustomerId: 'cus_1',
    userId: 'user_1',
    amount: 131136,
    currency: 'USD',
    status: 'processing',
    hostedCheckoutUrl: null,
    metadata: {},
    createdAt: new Date('2026-04-29T20:00:00.000Z'),
    updatedAt: new Date('2026-04-29T20:00:00.000Z'),
    lastWebhookAt: null,
  }

  return {
    openNodeCharge,
    getServerSession: vi.fn(),
    prisma: {
      openNodeCharge: {
        findUnique: vi.fn(),
        update: vi.fn(),
      },
    },
    getOpenNodeChargeStatus: vi.fn(),
    processConfirmedOpenNodePayment: vi.fn(),
    stripe: {
      invoices: {
        retrieve: vi.fn(),
      },
    },
  }
})

vi.mock('@/lib/api/getServerSession', () => ({
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

import handler from '@/pages/api/payment-status'

const invoice = {
  id: 'in_1',
  number: 'F3F91300-0012',
  customer: 'cus_1',
  customer_email: 'user@example.com',
  metadata: { userId: 'user_1' },
  status: 'open',
  total: 9900,
  amount_due: 9900,
  currency: 'usd',
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
      where: { id: 'row_1' },
      data: {
        status: 'paid',
        updatedAt: expect.any(Date),
      },
    })
    expect(mocks.processConfirmedOpenNodePayment).toHaveBeenCalledWith(
      {
        ...mocks.openNodeCharge,
        status: 'paid',
      },
      'paid',
    )
    expect(res._getJSONData()).toMatchObject({
      invoiceId: 'in_1',
      chargeId: 'charge_1',
      status: 'paid',
      amount: 99,
      currency: 'usd',
      invoice: {
        id: 'in_1',
        status: 'paid',
      },
    })
  })
})
