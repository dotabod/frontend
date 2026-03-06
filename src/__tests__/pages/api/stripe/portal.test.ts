import { createMocks } from 'node-mocks-http'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const getServerSessionMock = vi.fn()
const getSubscriptionMock = vi.fn()
const historicalSubscriptionFindFirstMock = vi.fn()
const portalCreateMock = vi.fn()

vi.mock('next-auth', () => ({
  getServerSession: (...args: unknown[]) => getServerSessionMock(...args),
}))

vi.mock('@/lib/auth', () => ({
  authOptions: {},
}))

vi.mock('@/utils/subscription', () => ({
  getSubscription: (...args: unknown[]) => getSubscriptionMock(...args),
}))

vi.mock('@/lib/db', () => ({
  default: {
    subscription: {
      findFirst: (...args: unknown[]) => historicalSubscriptionFindFirstMock(...args),
    },
  },
}))

vi.mock('@/lib/stripe-server', () => ({
  stripe: {
    billingPortal: {
      sessions: {
        create: (...args: unknown[]) => portalCreateMock(...args),
      },
    },
  },
}))

import handler from '@/pages/api/stripe/portal'

describe('/api/stripe/portal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.NEXTAUTH_URL = 'https://dotabod.com'
  })

  it('returns 405 for non-POST requests', async () => {
    const { req, res } = createMocks({ method: 'GET' })

    await handler(req, res)

    expect(res.statusCode).toBe(405)
    expect(res._getJSONData()).toEqual({ error: 'Method not allowed' })
  })

  it('returns 401 when user is not authenticated', async () => {
    getServerSessionMock.mockResolvedValue(null)

    const { req, res } = createMocks({ method: 'POST' })
    await handler(req, res)

    expect(res.statusCode).toBe(401)
    expect(res._getJSONData()).toEqual({ error: 'Unauthorized' })
  })

  it('creates portal session with active subscription customer ID', async () => {
    getServerSessionMock.mockResolvedValue({ user: { id: 'user_123', isImpersonating: false } })
    getSubscriptionMock.mockResolvedValue({ stripeCustomerId: 'cus_active_123' })
    portalCreateMock.mockResolvedValue({ url: 'https://billing.stripe.com/session/active' })

    const { req, res } = createMocks({ method: 'POST' })
    await handler(req, res)

    expect(historicalSubscriptionFindFirstMock).not.toHaveBeenCalled()
    expect(portalCreateMock).toHaveBeenCalledWith({
      customer: 'cus_active_123',
      return_url: 'https://dotabod.com/dashboard/billing',
    })
    expect(res.statusCode).toBe(200)
    expect(res._getJSONData()).toEqual({ url: 'https://billing.stripe.com/session/active' })
  })

  it('falls back to historical customer ID when active subscription has none', async () => {
    getServerSessionMock.mockResolvedValue({ user: { id: 'user_123', isImpersonating: false } })
    getSubscriptionMock.mockResolvedValue(null)
    historicalSubscriptionFindFirstMock.mockResolvedValue({ stripeCustomerId: 'cus_hist_123' })
    portalCreateMock.mockResolvedValue({ url: 'https://billing.stripe.com/session/historical' })

    const { req, res } = createMocks({ method: 'POST' })
    await handler(req, res)

    expect(historicalSubscriptionFindFirstMock).toHaveBeenCalledWith({
      where: {
        userId: 'user_123',
        stripeCustomerId: { not: null },
      },
      select: { stripeCustomerId: true },
      orderBy: { updatedAt: 'desc' },
    })
    expect(portalCreateMock).toHaveBeenCalledWith({
      customer: 'cus_hist_123',
      return_url: 'https://dotabod.com/dashboard/billing',
    })
    expect(res.statusCode).toBe(200)
    expect(res._getJSONData()).toEqual({ url: 'https://billing.stripe.com/session/historical' })
  })

  it('returns actionable error when no Stripe customer exists', async () => {
    getServerSessionMock.mockResolvedValue({ user: { id: 'user_123', isImpersonating: false } })
    getSubscriptionMock.mockResolvedValue(null)
    historicalSubscriptionFindFirstMock.mockResolvedValue(null)

    const { req, res } = createMocks({ method: 'POST' })
    await handler(req, res)

    expect(res.statusCode).toBe(400)
    expect(res._getJSONData()).toEqual({
      error: 'No Stripe customer found',
      code: 'NO_STRIPE_CUSTOMER',
      guidance: 'No active Stripe billing profile found. If you need help, contact support.',
    })
  })
})
