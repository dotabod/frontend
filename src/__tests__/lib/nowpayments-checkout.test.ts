import { Prisma } from '@prisma/client'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

vi.stubEnv('NOWPAYMENTS_API_KEY', 'test-api-key')
vi.stubEnv('NOWPAYMENTS_IPN_SECRET', 'test-ipn-secret')
vi.stubEnv('NEXTAUTH_URL', 'https://dotabod.com')

const mocks = vi.hoisted(() => ({
  prisma: {
    nowPaymentsInvoice: {
      create: vi.fn(),
      findUnique: vi.fn(),
    },
  },
  createNowPaymentsInvoice: vi.fn(),
}))

vi.mock('@/lib/db', () => ({ default: mocks.prisma }))
vi.mock('@/lib/nowpayments', () => ({
  createNowPaymentsInvoice: mocks.createNowPaymentsInvoice,
}))

let createAndStoreCryptoInvoice: typeof import('@/lib/nowpayments-checkout').createAndStoreCryptoInvoice

beforeAll(async () => {
  ;({ createAndStoreCryptoInvoice } = await import('@/lib/nowpayments-checkout'))
})

const stripeInvoice = {
  id: 'in_1',
  customer: 'cus_1',
  currency: 'usd',
  amount_remaining: 1300,
}

describe('createAndStoreCryptoInvoice', () => {
  beforeEach(() => {
    vi.stubEnv('NOWPAYMENTS_API_KEY', 'test-api-key')
    vi.stubEnv('NOWPAYMENTS_IPN_SECRET', 'test-ipn-secret')
    vi.stubEnv('NEXTAUTH_URL', 'https://dotabod.com')
  })

  it('creates a NOWPayments invoice and writes a DB row', async () => {
    mocks.createNowPaymentsInvoice.mockResolvedValue({
      id: 7777,
      invoice_url: 'https://nowpayments.io/payment/?iid=fresh',
    })
    mocks.prisma.nowPaymentsInvoice.create.mockResolvedValue({})

    const result = await createAndStoreCryptoInvoice({
      stripeInvoice,
      userId: 'user_1',
      orderDescription: 'Dotabod monthly subscription',
    })

    expect(result).toEqual({
      url: 'https://nowpayments.io/payment/?iid=fresh',
      nowPaymentsId: '7777',
    })
    expect(mocks.createNowPaymentsInvoice).toHaveBeenCalledWith(
      expect.objectContaining({
        price_amount: 13,
        price_currency: 'usd',
        order_id: 'in_1',
        order_description: 'Dotabod monthly subscription',
        ipn_callback_url: 'https://dotabod.com/api/webhooks/nowpayments',
      }),
    )
  })

  it('throws when the Stripe invoice has no balance due', async () => {
    await expect(
      createAndStoreCryptoInvoice({
        stripeInvoice: { ...stripeInvoice, amount_remaining: 0 },
        userId: 'user_1',
        orderDescription: 'test',
      }),
    ).rejects.toThrow(/no balance due/)
    expect(mocks.createNowPaymentsInvoice).not.toHaveBeenCalled()
  })

  it('returns the existing invoice URL when a race causes a P2002 unique conflict', async () => {
    mocks.createNowPaymentsInvoice.mockResolvedValue({
      id: 8888,
      invoice_url: 'https://nowpayments.io/payment/?iid=loser',
    })
    const conflict = new Prisma.PrismaClientKnownRequestError('Unique violation', {
      code: 'P2002',
      clientVersion: 'test',
    })
    mocks.prisma.nowPaymentsInvoice.create.mockRejectedValue(conflict)
    mocks.prisma.nowPaymentsInvoice.findUnique.mockResolvedValue({
      hostedInvoiceUrl: 'https://nowpayments.io/payment/?iid=winner',
      nowPaymentsId: '7777',
    })

    const result = await createAndStoreCryptoInvoice({
      stripeInvoice,
      userId: 'user_1',
      orderDescription: 'test',
    })

    expect(result).toEqual({
      url: 'https://nowpayments.io/payment/?iid=winner',
      nowPaymentsId: '7777',
    })
  })

  it('rethrows non-conflict errors from prisma.create', async () => {
    mocks.createNowPaymentsInvoice.mockResolvedValue({
      id: 9999,
      invoice_url: 'https://nowpayments.io/payment/?iid=z',
    })
    mocks.prisma.nowPaymentsInvoice.create.mockRejectedValue(new Error('db down'))

    await expect(
      createAndStoreCryptoInvoice({
        stripeInvoice,
        userId: 'user_1',
        orderDescription: 'test',
      }),
    ).rejects.toThrow(/db down/)
  })
})
