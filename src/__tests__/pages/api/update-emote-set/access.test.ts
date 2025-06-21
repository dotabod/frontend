import handler from '@/pages/api/update-emote-set'
import { createMocks } from 'node-mocks-http'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  setupEnv,
  cleanupEnv,
  getServerSession,
  getSubscription,
  canAccessFeature,
} from '../../helpers/updateEmoteSetMocks'

// Load shared mocks
import '../../helpers/updateEmoteSetMocks'

describe('update-emote-set API - access control', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    setupEnv()
  })

  afterEach(() => {
    cleanupEnv()
  })

  it('returns 403 when user is impersonating', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: {
        id: 'user-123',
        isImpersonating: true,
        name: 'Test User',
        image: 'image-url',
        twitchId: 'twitch-123',
        role: 'user',
        locale: 'en-US',
        scope: 'test-scope',
      },
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    })

    const { req, res } = createMocks({ method: 'GET' })

    await handler(req, res)

    expect(res.statusCode).toBe(403)
    expect(res._getJSONData()).toEqual({ message: 'Forbidden' })
  })

  it('returns 403 when user is not authenticated', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(null)

    const { req, res } = createMocks({ method: 'GET' })

    await handler(req, res)

    expect(res.statusCode).toBe(403)
    expect(res._getJSONData()).toEqual({ message: 'Forbidden' })
  })

  it('returns 403 when user does not have access to auto7TV feature', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: {
        id: 'user-123',
        name: 'Test User',
        image: 'image-url',
        isImpersonating: false,
        twitchId: 'twitch-123',
        role: 'user',
        locale: 'en-US',
        scope: 'test-scope',
      },
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    })

    vi.mocked(getSubscription).mockResolvedValueOnce({
      id: 'subscription-123',
      tier: 'FREE',
      stripeCustomerId: null,
      stripePriceId: null,
      stripeSubscriptionId: null,
      status: 'ACTIVE',
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
      isGift: false,
      transactionType: 'RECURRING',
      createdAt: new Date(),
      giftDetails: null,
      metadata: {},
    })

    vi.mocked(canAccessFeature).mockReturnValueOnce({
      hasAccess: false,
      requiredTier: 'PRO',
    })

    const { req, res } = createMocks({ method: 'GET' })

    await handler(req, res)

    expect(res.statusCode).toBe(403)
    expect(res._getJSONData()).toEqual({ message: 'Forbidden' })
  })
})
