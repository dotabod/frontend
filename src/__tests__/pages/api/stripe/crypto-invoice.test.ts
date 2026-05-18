import type { NextApiRequest, NextApiResponse } from 'next'
import { createMocks } from 'node-mocks-http'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

vi.stubEnv('NOWPAYMENTS_API_KEY', 'test-api-key')
vi.stubEnv('NOWPAYMENTS_IPN_SECRET', 'test-ipn-secret')
vi.stubEnv('NEXTAUTH_URL', 'https://dotabod.com')

const mocks = vi.hoisted(() => ({
  prisma: {
    subscription: { findFirst: vi.fn() },
    nowPaymentsInvoice: {
      findUnique: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    },
  },
  stripe: {
    invoices: {
      retrieve: vi.fn(),
      finalizeInvoice: vi.fn(),
    },
    prices: {
      retrieve: vi.fn(),
    },
  },
  getServerSession: vi.fn(),
  createNowPaymentsInvoice: vi.fn(),
  featureFlags: { enableCryptoPayments: true },
}))

vi.mock('@/lib/db', () => ({ default: mocks.prisma }))
vi.mock('@/lib/stripe-server', () => ({ stripe: mocks.stripe }))
vi.mock('@/lib/api/getServerSession', () => ({ getServerSession: mocks.getServerSession }))
vi.mock('@/lib/auth', () => ({ authOptions: {} }))
vi.mock('@/lib/featureFlags', () => ({ featureFlags: mocks.featureFlags }))
vi.mock('@/lib/nowpayments', () => ({
  createNowPaymentsInvoice: mocks.createNowPaymentsInvoice,
}))
vi.mock('@/utils/subscription', () => ({
  CRYPTO_PRICE_IDS: [{ monthly: 'price_mo', annual: 'price_yr', lifetime: 'price_lt' }],
}))

let handler: typeof import('@/pages/api/stripe/crypto-invoice').default

beforeAll(async () => {
  ;({ default: handler } = await import('@/pages/api/stripe/crypto-invoice'))
})

function buildReq() {
  return createMocks<NextApiRequest, NextApiResponse>({ method: 'POST' })
}

const session = {
  user: { id: 'user_1', isImpersonating: false },
}

const cryptoSubscription = {
  userId: 'user_1',
  stripePriceId: 'price_mo',
  status: 'ACTIVE',
  metadata: {
    isCryptoPayment: 'true',
    renewalInvoiceId: 'in_renew_1',
  },
}

describe('POST /api/stripe/crypto-invoice', () => {
  beforeEach(() => {
    vi.stubEnv('NOWPAYMENTS_API_KEY', 'test-api-key')
    vi.stubEnv('NOWPAYMENTS_IPN_SECRET', 'test-ipn-secret')
    vi.stubEnv('NEXTAUTH_URL', 'https://dotabod.com')
    mocks.featureFlags.enableCryptoPayments = true
    mocks.getServerSession.mockResolvedValue(session)
    mocks.prisma.subscription.findFirst.mockResolvedValue(cryptoSubscription)
  })

  it('returns the cached NOWPayments invoice URL when one already exists in a payable state', async () => {
    mocks.prisma.nowPaymentsInvoice.findUnique.mockResolvedValue({
      hostedInvoiceUrl: 'https://nowpayments.io/payment/?iid=existing',
      status: 'waiting',
    })
    mocks.stripe.invoices.retrieve.mockResolvedValue({ id: 'in_renew_1', status: 'open' })

    const { req, res } = buildReq()
    await handler(req, res)

    expect(res._getStatusCode()).toBe(200)
    expect(res._getJSONData().url).toBe('https://nowpayments.io/payment/?iid=existing')
    expect(mocks.createNowPaymentsInvoice).not.toHaveBeenCalled()
  })

  it('discards a terminal-state cached invoice and creates a fresh one', async () => {
    mocks.prisma.nowPaymentsInvoice.findUnique.mockResolvedValue({
      hostedInvoiceUrl: 'https://nowpayments.io/payment/?iid=stale',
      status: 'expired',
    })
    mocks.prisma.nowPaymentsInvoice.delete.mockResolvedValue({})
    mocks.stripe.invoices.retrieve.mockResolvedValue({
      id: 'in_renew_1',
      status: 'open',
      customer: 'cus_1',
      currency: 'usd',
      amount_remaining: 1300,
    })
    mocks.createNowPaymentsInvoice.mockResolvedValue({
      id: 6666,
      invoice_url: 'https://nowpayments.io/payment/?iid=replacement',
    })

    const { req, res } = buildReq()
    await handler(req, res)

    expect(mocks.prisma.nowPaymentsInvoice.delete).toHaveBeenCalledWith({
      where: { stripeInvoiceId: 'in_renew_1' },
    })
    expect(res._getStatusCode()).toBe(200)
    expect(res._getJSONData().url).toBe('https://nowpayments.io/payment/?iid=replacement')
  })

  it('creates a fresh NOWPayments invoice when none exists for this renewal', async () => {
    mocks.prisma.nowPaymentsInvoice.findUnique.mockResolvedValue(null)
    mocks.stripe.invoices.retrieve.mockResolvedValue({
      id: 'in_renew_1',
      status: 'open',
      customer: 'cus_1',
      currency: 'usd',
      amount_remaining: 1300,
    })
    mocks.createNowPaymentsInvoice.mockResolvedValue({
      id: 5555,
      invoice_url: 'https://nowpayments.io/payment/?iid=fresh',
    })
    mocks.prisma.nowPaymentsInvoice.create.mockResolvedValue({})
    mocks.prisma.nowPaymentsInvoice.delete.mockResolvedValue({})

    const { req, res } = buildReq()
    await handler(req, res)

    expect(res._getStatusCode()).toBe(200)
    expect(res._getJSONData().url).toBe('https://nowpayments.io/payment/?iid=fresh')
    expect(mocks.createNowPaymentsInvoice).toHaveBeenCalledWith(
      expect.objectContaining({
        price_amount: 13,
        price_currency: 'usd',
        order_id: 'in_renew_1',
        ipn_callback_url: 'https://dotabod.com/api/webhooks/nowpayments',
      }),
    )
    expect(mocks.prisma.nowPaymentsInvoice.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        nowPaymentsId: '5555',
        stripeInvoiceId: 'in_renew_1',
        userId: 'user_1',
        hostedInvoiceUrl: 'https://nowpayments.io/payment/?iid=fresh',
      }),
    })
  })

  it('finalizes a draft renewal invoice before creating the NOWPayments invoice', async () => {
    mocks.prisma.nowPaymentsInvoice.findUnique.mockResolvedValue(null)
    mocks.stripe.invoices.retrieve.mockResolvedValue({
      id: 'in_renew_1',
      status: 'draft',
      customer: 'cus_1',
      currency: 'usd',
      amount_remaining: 1300,
    })
    mocks.stripe.invoices.finalizeInvoice.mockResolvedValue({
      id: 'in_renew_1',
      status: 'open',
      customer: 'cus_1',
      currency: 'usd',
      amount_remaining: 1300,
    })
    mocks.createNowPaymentsInvoice.mockResolvedValue({
      id: 5556,
      invoice_url: 'https://nowpayments.io/payment/?iid=fresh2',
    })

    const { req, res } = buildReq()
    await handler(req, res)

    expect(mocks.stripe.invoices.finalizeInvoice).toHaveBeenCalledWith('in_renew_1')
    expect(res._getStatusCode()).toBe(200)
    expect(res._getJSONData().url).toBe('https://nowpayments.io/payment/?iid=fresh2')
  })

  it('rejects a void or uncollectible invoice', async () => {
    mocks.prisma.nowPaymentsInvoice.findUnique.mockResolvedValue(null)
    mocks.stripe.invoices.retrieve.mockResolvedValue({ id: 'in_renew_1', status: 'void' })

    const { req, res } = buildReq()
    await handler(req, res)

    expect(res._getStatusCode()).toBe(400)
    expect(mocks.createNowPaymentsInvoice).not.toHaveBeenCalled()
  })

  it('rejects a void Stripe invoice even when a reusable cached NOWPayments row exists', async () => {
    mocks.prisma.nowPaymentsInvoice.findUnique.mockResolvedValue({
      hostedInvoiceUrl: 'https://nowpayments.io/payment/?iid=cached',
      status: 'waiting',
    })
    mocks.stripe.invoices.retrieve.mockResolvedValue({ id: 'in_renew_1', status: 'void' })

    const { req, res } = buildReq()
    await handler(req, res)

    expect(res._getStatusCode()).toBe(400)
    expect(mocks.prisma.nowPaymentsInvoice.findUnique).not.toHaveBeenCalled()
  })

  it('rejects impersonation', async () => {
    mocks.getServerSession.mockResolvedValue({
      user: { id: 'user_1', isImpersonating: true },
    })
    const { req, res } = buildReq()
    await handler(req, res)
    expect(res._getStatusCode()).toBe(403)
  })

  it('blocks the request when the crypto feature flag is off', async () => {
    mocks.featureFlags.enableCryptoPayments = false
    const { req, res } = buildReq()
    await handler(req, res)
    expect(res._getStatusCode()).toBe(403)
  })
})
