import type { NextApiRequest, NextApiResponse } from 'next'
import { createMocks } from 'node-mocks-http'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { z } from 'zod'

vi.stubEnv('NOWPAYMENTS_API_KEY', 'test-api-key')
vi.stubEnv('NOWPAYMENTS_IPN_SECRET', 'test-ipn-secret')
vi.stubEnv('NEXTAUTH_URL', 'https://dotabod.com')
vi.stubEnv('NEXT_PUBLIC_STRIPE_PRO_ANNUAL_PRICE_ID', 'price_yr')
vi.stubEnv('NEXT_PUBLIC_STRIPE_PRO_LIFETIME_PRICE_ID', 'price_life')
vi.stubEnv('NEXT_PUBLIC_STRIPE_PRO_MONTHLY_PRICE_ID', 'price_mo')

type ExistingSubscription = { stripeCustomerId: string } | null
interface StripeCustomerCreateInput {
  email?: string
  metadata: Record<string, string>
}
interface StripeInvoiceItemCreateInput {
  customer: string
  invoice: string
  price_data: {
    currency: string
    product: string
    unit_amount: number
  }
}
interface StripePriceResult {
  active?: boolean
  currency?: string
  id?: string
  product?: string
  recurring?: { interval: string; interval_count: number }
  type?: string
  unit_amount?: number | null
}

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
    checkout: {
      sessions: {
        create:
          vi.fn<
            (params: {
              subscription_data?: { trial_period_days?: number }
            }) => Promise<{ url: string }>
          >(),
      },
    },
    customers: {
      create: vi.fn<(params: StripeCustomerCreateInput) => Promise<{ id: string }>>(),
      list: vi.fn<
        (params: { email: string; limit: number }) => Promise<{ data: { id: string }[] }>
      >(),
      retrieve: vi.fn<(customerId: string) => Promise<{ id: string }>>(),
    },
    invoiceItems: {
      create: vi.fn<(params: StripeInvoiceItemCreateInput) => Promise<Record<string, never>>>(),
    },
    invoices: {
      create: vi.fn(),
      finalizeInvoice: vi.fn(),
      markUncollectible: vi.fn(),
      retrieve: vi.fn(),
      update: vi.fn(),
      voidInvoice: vi.fn(),
    },
    prices: { retrieve: vi.fn<(priceId: string) => Promise<StripePriceResult>>() },
    subscriptions: {
      list: vi.fn<
        (params: {
          customer: string
          limit: number
          status: 'all'
        }) => Promise<{ data: { id: string }[] }>
      >(),
    },
  },
}))

vi.mock('@/lib/db', () => ({ default: mocks.prisma }))
vi.mock('@/lib/stripe-server', () => ({ stripe: mocks.stripe }))
vi.mock('@/lib/api/get-server-session', () => ({ getServerSession: mocks.getServerSession }))
vi.mock('@/lib/auth', () => ({ authOptions: {} }))
vi.mock('@/lib/feature-flags', () => ({ featureFlags: mocks.featureFlags }))
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

const checkoutResponseSchema = z.object({ url: z.string().url() })

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

const buildReq = function buildReq(body: Record<string, unknown> = { priceId: 'price_mo' }) {
  return createMocks<NextApiRequest, NextApiResponse>({
    body,
    headers: { referer: 'https://dotabod.com/dashboard/billing' },
    method: 'POST',
  })
}

const arrangeTransaction = function arrangeTransaction(timeline: string[]) {
  const tx = {
    subscription: {
      findFirst: vi.fn<() => Promise<ExistingSubscription>>().mockResolvedValue(null),
      updateMany: vi.fn<() => Promise<{ count: number }>>().mockResolvedValue({ count: 0 }),
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
    mocks.stripe.customers.list.mockResolvedValue({ data: [{ id: 'cus_1' }] })
    mocks.stripe.customers.retrieve.mockResolvedValue({ id: 'cus_1' })
    mocks.stripe.prices.retrieve.mockResolvedValue({
      active: true,
      currency: 'usd',
      id: 'price_mo',
      product: 'prod_1',
      recurring: { interval: 'month', interval_count: 1 },
      type: 'recurring',
      unit_amount: 1300,
    })
    mocks.stripe.subscriptions.list.mockResolvedValue({ data: [] })
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
      expect(checkoutResponseSchema.parse(res._getJSONData()).url).toBe(
        'https://nowpayments.io/payment/?iid=7777',
      )
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
      expect(checkoutResponseSchema.parse(res._getJSONData()).url).toBe(
        'https://checkout.stripe.com/abc',
      )
      expect(mocks.createNowPaymentsInvoice).not.toHaveBeenCalled()
      expect(mocks.prisma.nowPaymentsInvoice.create).not.toHaveBeenCalled()
      const checkoutParams = mocks.stripe.checkout.sessions.create.mock.calls[0]?.[0]
      expect(checkoutParams?.subscription_data?.trial_period_days).toBe(14)
    })

    it('does not grant a trial when Stripe has a prior subscription missing from the database', async () => {
      arrangeTransaction([])
      mocks.stripe.subscriptions.list.mockResolvedValue({ data: [{ id: 'sub_previous' }] })
      mocks.stripe.checkout.sessions.create.mockResolvedValue({
        url: 'https://checkout.stripe.com/returning',
      })

      const { req, res } = buildReq({ priceId: 'price_mo' })
      await handler(req, res)

      expect(res._getStatusCode()).toBe(200)
      expect(mocks.stripe.subscriptions.list).toHaveBeenCalledOnce()
      const checkoutParams = mocks.stripe.checkout.sessions.create.mock.calls[0]?.[0]
      expect(checkoutParams?.subscription_data).not.toHaveProperty('trial_period_days')
    })

    it('does not grant a trial to an account with local subscription history', async () => {
      const tx = arrangeTransaction([])
      tx.subscription.findFirst.mockResolvedValue({ stripeCustomerId: 'cus_1' })
      mocks.stripe.checkout.sessions.create.mockResolvedValue({
        url: 'https://checkout.stripe.com/returning',
      })

      const { req, res } = buildReq({ priceId: 'price_mo' })
      await handler(req, res)

      expect(res._getStatusCode()).toBe(200)
      expect(mocks.stripe.subscriptions.list).not.toHaveBeenCalled()
      const checkoutParams = mocks.stripe.checkout.sessions.create.mock.calls[0]?.[0]
      expect(checkoutParams?.subscription_data).not.toHaveProperty('trial_period_days')
    })

    it('fails closed on trial eligibility lookup errors without blocking checkout', async () => {
      arrangeTransaction([])
      mocks.stripe.subscriptions.list.mockImplementation(() => {
        throw new Error('Stripe unavailable')
      })
      mocks.stripe.checkout.sessions.create.mockResolvedValue({
        url: 'https://checkout.stripe.com/no-trial',
      })

      const { req, res } = buildReq({ priceId: 'price_mo' })
      await handler(req, res)

      expect(res._getStatusCode()).toBe(200)
      const checkoutParams = mocks.stripe.checkout.sessions.create.mock.calls[0]?.[0]
      expect(checkoutParams?.subscription_data).not.toHaveProperty('trial_period_days')
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
      expect(checkoutResponseSchema.parse(res._getJSONData()).url).toBe(
        'https://checkout.stripe.com/no-crypto',
      )
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

    it('rejects price IDs outside the configured checkout allowlist', async () => {
      const { req, res } = buildReq({ priceId: 'price_unknown' })

      await handler(req, res)

      expect(res._getStatusCode()).toBe(400)
      expect(mocks.stripe.prices.retrieve).not.toHaveBeenCalled()
      expect(mocks.prisma.$transaction).not.toHaveBeenCalled()
    })

    it('rejects configured prices whose Stripe attributes do not match', async () => {
      mocks.stripe.prices.retrieve.mockResolvedValue({
        active: false,
        currency: 'usd',
        recurring: { interval: 'month', interval_count: 1 },
        type: 'recurring',
      })
      const { req, res } = buildReq({ priceId: 'price_mo' })

      await handler(req, res)

      expect(res._getStatusCode()).toBe(400)
      expect(mocks.prisma.$transaction).not.toHaveBeenCalled()
    })
  })
})
