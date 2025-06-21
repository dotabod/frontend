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

import '../../helpers/updateEmoteSetMocks'

describe('update-emote-set API - validation', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    setupEnv()
  })

  afterEach(() => {
    cleanupEnv()
  })

  it('returns 400 when Twitch ID is missing', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: {
        id: 'user-123',
        name: 'Test User',
        image: 'image-url',
        isImpersonating: false,
        twitchId: '',
        role: 'user',
        locale: 'en-US',
        scope: 'test-scope',
      },
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    })

    vi.mocked(getSubscription).mockResolvedValueOnce({
      id: 'subscription-123',
      tier: 'PRO',
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
      hasAccess: true,
      requiredTier: 'PRO',
    })

    const { req, res } = createMocks({ method: 'GET' })

    await handler(req, res)

    expect(res.statusCode).toBe(400)
    expect(res._getJSONData()).toEqual({ message: 'Twitch ID is required' })
  })

  it('returns 400 when emotesRequired is not defined', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: {
        id: 'user-123',
        twitchId: 'twitch-123',
        name: 'Test User',
        image: 'image-url',
        isImpersonating: false,
        role: 'user',
        locale: 'en-US',
        scope: 'test-scope',
      },
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    })

    vi.mocked(getSubscription).mockResolvedValueOnce({
      id: 'subscription-123',
      tier: 'PRO',
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
      hasAccess: true,
      requiredTier: 'PRO',
    })

    vi.mock('@/components/Dashboard/ChatBot', () => ({
      emotesRequired: [],
    }))

    const { req, res } = createMocks({ method: 'GET' })

    await handler(req, res)

    expect(res.statusCode).toBe(400)
    expect(res._getJSONData()).toEqual({ message: 'No emotes defined for addition' })
  })

  it('returns 500 when SEVENTV_AUTH is not set', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: {
        id: 'user-123',
        twitchId: 'twitch-123',
        name: 'Test User',
        image: 'image-url',
        isImpersonating: false,
        role: 'user',
        locale: 'en-US',
        scope: 'test-scope',
      },
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    })

    vi.mocked(getSubscription).mockResolvedValueOnce({
      id: 'subscription-123',
      tier: 'PRO',
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
      hasAccess: true,
      requiredTier: 'PRO',
    })

    vi.stubEnv('SEVENTV_AUTH', '')

    const { req, res } = createMocks({ method: 'GET' })

    await handler(req, res)

    vi.unstubAllEnvs()

    expect(res.statusCode).toBe(400)
    expect(res._getJSONData()).toEqual({ message: 'No emotes defined for addition' })
  })
})
