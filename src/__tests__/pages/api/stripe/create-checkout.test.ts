import type { NextApiRequest, NextApiResponse } from 'next'
import { createMocks } from 'node-mocks-http'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vite-plus/test'

vi.stubEnv('NOWPAYMENTS_API_KEY', 'test-api-key')
vi.stubEnv('NOWPAYMENTS_IPN_SECRET', 'test-ipn-secret')
vi.stubEnv('NEXTAUTH_URL', 'https://dotabod.com')

const mocks = vi.hoisted(() => ({
  createNowPaymentsInvoice: vi.fn(),
  featureFlags: { enableCryptoPayments: true },
  getServerSession: vi.fn(),
  getSubscription: vi.fn(),
  prisma: {
    $transaction: vi.fn(),
    nowPaymentsInvoice: {
      create: vi.fn(),
      findUnique: vi.fn(),
    },
    subscription: {
      findFirst: vi.fn(),
      updateMany: vi.fn(),
    },
  },
  stripe: {
    checkout: { sessions: { create: vi.fn() } },
    customers: { create: vi.fn(), list: vi.fn(), retrieve: vi.fn() },
    invoiceItems: { create: vi.fn() },
    invoices: {
      create: vi.fn(),
      finalizeInvoice: vi.fn(),
      markUncollectible: vi.fn(),
      retrieve: vi.fn(),
      update: vi.fn(),
      voidInvoice: vi.fn(),
    },
    prices: { retrieve: vi.fn() },
  },
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
  GRACE_PERIOD_END: new Date('2099-01-01'),
  getCurrentPeriod: () => 'monthly',
  getSubscription: mocks.getSubscription,
  isInGracePeriod: () => false,
}))

let handler: typeof import('@/pages/api/stripe/create-checkout').default

beforeAll(async () => {
  ;({ default: handler } = await import('@/pages/api/stripe/create-checkout'))
})

const session = {
  user: {
    email: 'user@example.com',
    id: 'user_1',
    image: '',
    isImpersonating: false,
    locale: 'en',
    name: 'Test User',
    twitchId: 'twitch_1',
  },
}

function buildReq(body: Record<string, unknown> = { priceId: 'price_mo' }) {
  return createMocks<NextApiRequest, NextApiResponse>({
    body,
    headers: { referer: 'https://dotabod.com/dashboard/billing' },
    method: 'POST',
  })
}

function arrangeTransaction(timeline: string[]) {
  const tx = {
    subscription: {
      findFirst: vi.fn().mockResolvedValue({ stripeCustomerId: 'cus_1' }),
      updateMany: vi.fn().mockResolvedValue({ count: 0 }),
    },
  }
  mocks.prisma.$transaction.mockImplementation(async (callback: (tx: unknown) => unknown) => {
    timeline.push('tx:start')
    const result = await callback(tx)
    timeline.push('tx:end')
    return result
  })
  return tx
}

describe('POST /api/stripe/create-checkout', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.featureFlags.enableCryptoPayments = true
    mocks.getServerSession.mockResolvedValue(session)
    mocks.getSubscription.mockResolvedValue(null)
    mocks.stripe.customers.retrieve.mockResolvedValue({ id: 'cus_1' })
    mocks.stripe.prices.retrieve.mockResolvedValue({
      currency: 'usd',
      product: 'prod_1',
      type: 'recurring',
      unit_amount: 1300,
    })
  })

  describe('connection pool deadlock regression', () => {
    // Production runs with connection_limit=1. If the crypto flow's
    // Prisma.nowPaymentsInvoice.create() runs inside the outer $transaction it
    // Tries to grab a second pool connection while the tx still holds the only
    // One → P2024/P2028 deadlock. These tests pin the transaction boundary.

    it('runs prisma.nowPaymentsInvoice.create after the outer $transaction has closed', async () => {
      const timeline: string[] = []
      arrangeTransaction(timeline)

      mocks.stripe.invoices.create.mockResolvedValue({ id: 'in_1' })
      mocks.stripe.invoiceItems.create.mockResolvedValue({})
      mocks.stripe.invoices.finalizeInvoice.mockResolvedValue({
        amount_remaining: 1300,
        currency: 'usd',
        customer: 'cus_1',
        id: 'in_1',
      })
      mocks.stripe.invoices.update.mockResolvedValue({})
      mocks.createNowPaymentsInvoice.mockResolvedValue({
        id: 9001,
        invoice_url: 'https://nowpayments.io/payment/?iid=9001',
      })
      mocks.prisma.nowPaymentsInvoice.create.mockImplementation(async () => {
        timeline.push('prisma.nowPaymentsInvoice.create')
        return {}
      })

      const { req, res } = buildReq({ paymentMethod: 'crypto', priceId: 'price_mo' })
      await handler(req, res)

      expect(res._getStatusCode()).toBe(200)
      const txEnd = timeline.indexOf('tx:end')
      const npCreate = timeline.indexOf('prisma.nowPaymentsInvoice.create')
      expect(txEnd).toBeGreaterThanOrEqual(0)
      expect(npCreate).toBeGreaterThan(txEnd)
    })

    it('makes external API calls (Stripe invoice + NOWPayments) outside the $transaction', async () => {
      const timeline: string[] = []
      arrangeTransaction(timeline)

      mocks.stripe.invoices.create.mockImplementation(async () => {
        timeline.push('stripe.invoices.create')
        return { id: 'in_1' }
      })
      mocks.stripe.invoiceItems.create.mockResolvedValue({})
      mocks.stripe.invoices.finalizeInvoice.mockResolvedValue({
        amount_remaining: 1300,
        currency: 'usd',
        customer: 'cus_1',
        id: 'in_1',
      })
      mocks.stripe.invoices.update.mockResolvedValue({})
      mocks.createNowPaymentsInvoice.mockImplementation(async () => {
        timeline.push('nowpayments.createInvoice')
        return { id: 9002, invoice_url: 'https://nowpayments.io/payment/?iid=9002' }
      })
      mocks.prisma.nowPaymentsInvoice.create.mockResolvedValue({})

      const { req, res } = buildReq({ paymentMethod: 'crypto', priceId: 'price_mo' })
      await handler(req, res)

      expect(res._getStatusCode()).toBe(200)
      const txEnd = timeline.indexOf('tx:end')
      expect(timeline.indexOf('stripe.invoices.create')).toBeGreaterThan(txEnd)
      expect(timeline.indexOf('nowpayments.createInvoice')).toBeGreaterThan(txEnd)
    })

    it('does not call stripe.checkout.sessions.create until the $transaction closes (non-crypto path)', async () => {
      const timeline: string[] = []
      arrangeTransaction(timeline)

      mocks.stripe.checkout.sessions.create.mockImplementation(async () => {
        timeline.push('stripe.checkout.sessions.create')
        return { url: 'https://checkout.stripe.com/x' }
      })

      const { req, res } = buildReq({ priceId: 'price_mo' })
      await handler(req, res)

      expect(res._getStatusCode()).toBe(200)
      const txEnd = timeline.indexOf('tx:end')
      expect(timeline.indexOf('stripe.checkout.sessions.create')).toBeGreaterThan(txEnd)
    })
  })

  describe('happy paths', () => {
    it('returns the NOWPayments hosted invoice URL for a crypto checkout', async () => {
      arrangeTransaction([])
      mocks.stripe.invoices.create.mockResolvedValue({ id: 'in_2' })
      mocks.stripe.invoiceItems.create.mockResolvedValue({})
      mocks.stripe.invoices.finalizeInvoice.mockResolvedValue({
        amount_remaining: 1300,
        currency: 'usd',
        customer: 'cus_1',
        id: 'in_2',
      })
      mocks.stripe.invoices.update.mockResolvedValue({})
      mocks.createNowPaymentsInvoice.mockResolvedValue({
        id: 7777,
        invoice_url: 'https://nowpayments.io/payment/?iid=7777',
      })
      mocks.prisma.nowPaymentsInvoice.create.mockResolvedValue({})

      const { req, res } = buildReq({ paymentMethod: 'crypto', priceId: 'price_mo' })
      await handler(req, res)

      expect(res._getStatusCode()).toBe(200)
      expect(res._getJSONData().url).toBe('https://nowpayments.io/payment/?iid=7777')
      expect(mocks.prisma.nowPaymentsInvoice.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          nowPaymentsId: '7777',
          stripeInvoiceId: 'in_2',
          userId: 'user_1',
        }),
      })
    })

    it('returns the Stripe checkout URL for a card checkout', async () => {
      arrangeTransaction([])
      mocks.stripe.checkout.sessions.create.mockResolvedValue({
        url: 'https://checkout.stripe.com/abc',
      })

      const { req, res } = buildReq({ priceId: 'price_mo' })
      await handler(req, res)

      expect(res._getStatusCode()).toBe(200)
      expect(res._getJSONData().url).toBe('https://checkout.stripe.com/abc')
      expect(mocks.createNowPaymentsInvoice).not.toHaveBeenCalled()
      expect(mocks.prisma.nowPaymentsInvoice.create).not.toHaveBeenCalled()
    })

    it('falls back to a card checkout when the crypto feature flag is off', async () => {
      mocks.featureFlags.enableCryptoPayments = false
      arrangeTransaction([])
      mocks.stripe.checkout.sessions.create.mockResolvedValue({
        url: 'https://checkout.stripe.com/no-crypto',
      })

      const { req, res } = buildReq({ paymentMethod: 'crypto', priceId: 'price_mo' })
      await handler(req, res)

      expect(res._getStatusCode()).toBe(200)
      expect(res._getJSONData().url).toBe('https://checkout.stripe.com/no-crypto')
      expect(mocks.createNowPaymentsInvoice).not.toHaveBeenCalled()
    })
  })

  describe('auth guards', () => {
    it('rejects unauthenticated requests', async () => {
      mocks.getServerSession.mockResolvedValue(null)
      const { req, res } = buildReq()
      await handler(req, res)
      expect(res._getStatusCode()).toBe(401)
      expect(mocks.prisma.$transaction).not.toHaveBeenCalled()
    })

    it('rejects impersonated sessions', async () => {
      mocks.getServerSession.mockResolvedValue({
        user: { ...session.user, isImpersonating: true },
      })
      const { req, res } = buildReq()
      await handler(req, res)
      expect(res._getStatusCode()).toBe(403)
      expect(mocks.prisma.$transaction).not.toHaveBeenCalled()
    })

    it('rejects requests missing priceId', async () => {
      const { req, res } = buildReq({})
      await handler(req, res)
      expect(res._getStatusCode()).toBe(400)
      expect(mocks.prisma.$transaction).not.toHaveBeenCalled()
    })
  })
})
