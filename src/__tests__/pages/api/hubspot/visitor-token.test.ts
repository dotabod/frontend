import { createMocks } from 'node-mocks-http'
import { beforeEach, describe, expect, it, vi } from 'vite-plus/test'

vi.mock('@/lib/api/getServerSession', () => ({ getServerSession: vi.fn() }))
vi.mock('@/lib/auth', () => ({ authOptions: {} }))
vi.mock('@/lib/hubspot', () => ({
  subscriptionToValue: vi.fn(() => 'pro'),
  syncHubSpotContact: vi.fn().mockResolvedValue(undefined),
}))
vi.mock('@/utils/subscription', () => ({ getSubscription: vi.fn() }))
vi.mock('node-fetch', () => ({ default: vi.fn() }))
vi.mock('@sentry/nextjs', () => ({ captureException: vi.fn() }))

import fetch from 'node-fetch'
import { getServerSession } from '@/lib/api/getServerSession'
import { subscriptionToValue, syncHubSpotContact } from '@/lib/hubspot'
import handler from '@/pages/api/hubspot/visitor-token'
import { getSubscription } from '@/utils/subscription'

const anyVal = (v: unknown) => v as any

const tokenOk = () =>
  anyVal({ json: async () => ({ token: 'vtok' }), ok: true, status: 200, statusText: 'OK' })

const session = (over: Record<string, unknown> = {}) =>
  anyVal({
    user: {
      email: 'gamer@example.com',
      id: 'user-1',
      isImpersonating: false,
      name: 'Cool Gamer',
      ...over,
    },
  })

describe('GET /api/hubspot/visitor-token', () => {
  beforeEach(() => {
    vi.stubEnv('HUBSPOT_PRIVATE_APP_TOKEN', 'test-token')
    vi.mocked(getSubscription).mockResolvedValue(anyVal({ status: 'ACTIVE', tier: 'PRO' }))
    vi.mocked(fetch).mockResolvedValue(tokenOk())
    vi.mocked(syncHubSpotContact).mockResolvedValue()
    vi.mocked(subscriptionToValue).mockReturnValue('pro')
  })

  it('returns 405 for non-GET methods', async () => {
    const { req, res } = createMocks({ method: 'POST' })
    await handler(anyVal(req), anyVal(res))
    expect(res.statusCode).toBe(405)
  })

  it('returns 204 for anonymous requests (no session email)', async () => {
    vi.mocked(getServerSession).mockResolvedValue(null)
    const { req, res } = createMocks({ method: 'GET' })
    await handler(anyVal(req), anyVal(res))
    expect(res.statusCode).toBe(204)
    expect(syncHubSpotContact).not.toHaveBeenCalled()
  })

  it('returns 500 when the private app token is not configured', async () => {
    vi.stubEnv('HUBSPOT_PRIVATE_APP_TOKEN', '')
    vi.mocked(getServerSession).mockResolvedValue(session())
    const { req, res } = createMocks({ method: 'GET' })
    await handler(anyVal(req), anyVal(res))
    expect(res.statusCode).toBe(500)
  })

  it('returns the visitor token and enriches the contact (fire-and-forget)', async () => {
    vi.mocked(getServerSession).mockResolvedValue(session())
    const { req, res } = createMocks({ method: 'GET' })
    await handler(anyVal(req), anyVal(res))

    expect(res.statusCode).toBe(200)
    expect(res._getJSONData()).toEqual({ email: 'gamer@example.com', token: 'vtok' })

    await vi.waitFor(() => expect(syncHubSpotContact).toHaveBeenCalled())
    expect(syncHubSpotContact).toHaveBeenCalledWith('test-token', {
      email: 'gamer@example.com',
      subscription: 'pro',
      username: 'Cool Gamer',
    })
  })

  it('returns 500 and does not enrich when the token request fails', async () => {
    vi.mocked(getServerSession).mockResolvedValue(session())
    vi.mocked(fetch).mockResolvedValue(
      anyVal({ json: async () => ({}), ok: false, status: 403, statusText: 'Forbidden' }),
    )
    const { req, res } = createMocks({ method: 'GET' })
    await handler(anyVal(req), anyVal(res))

    expect(res.statusCode).toBe(500)
    await new Promise((r) => setTimeout(r, 20))
    expect(syncHubSpotContact).not.toHaveBeenCalled()
  })

  it('skips enrichment while impersonating but still returns the token', async () => {
    vi.mocked(getServerSession).mockResolvedValue(session({ isImpersonating: true }))
    const { req, res } = createMocks({ method: 'GET' })
    await handler(anyVal(req), anyVal(res))

    expect(res.statusCode).toBe(200)
    await new Promise((r) => setTimeout(r, 20))
    expect(syncHubSpotContact).not.toHaveBeenCalled()
  })

  it('does not overwrite the subscription with "free" on a DB error', async () => {
    vi.mocked(getServerSession).mockResolvedValue(session())
    vi.mocked(getSubscription).mockRejectedValue(new Error('db down'))
    const { req, res } = createMocks({ method: 'GET' })
    await handler(anyVal(req), anyVal(res))

    expect(res.statusCode).toBe(200)
    await vi.waitFor(() => expect(syncHubSpotContact).toHaveBeenCalled())
    expect(syncHubSpotContact).toHaveBeenCalledWith('test-token', {
      email: 'gamer@example.com',
      subscription: undefined,
      username: 'Cool Gamer',
    })
    expect(subscriptionToValue).not.toHaveBeenCalled()
  })
})
