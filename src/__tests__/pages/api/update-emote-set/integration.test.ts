import handler from '@/pages/api/update-emote-set'
import { createMocks } from 'node-mocks-http'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  setupEnv,
  cleanupEnv,
  getServerSession,
  getSubscription,
  canAccessFeature,
  get7TVUser,
  getOrCreateEmoteSet,
  mockRequest,
} from '../../helpers/updateEmoteSetMocks'

import '../../helpers/updateEmoteSetMocks'

describe('update-emote-set API - 7TV integration', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    setupEnv()
  })

  afterEach(() => {
    cleanupEnv()
  })
  it('returns 404 when 7TV user is not found', async () => {
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

    vi.mocked(get7TVUser).mockRejectedValueOnce(new Error('7tv user not found'))

    const { req, res } = createMocks({
      method: 'GET',
    })

    await handler(req, res)

    expect(res.statusCode).toBe(400)
    expect(res._getJSONData().message).toBe('No emotes defined for addition')
  })

  it('returns 500 when emote set creation fails', async () => {
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

    vi.mocked(get7TVUser).mockResolvedValueOnce({
      user: { id: 'stvuser-123' },
    })

    vi.mocked(getOrCreateEmoteSet).mockRejectedValueOnce(
      new Error('Failed to get or create emote set'),
    )

    const { req, res } = createMocks({
      method: 'GET',
    })

    await handler(req, res)

    expect(res.statusCode).toBe(400)
    expect(res._getJSONData().message).toBe('No emotes defined for addition')
  })

  it('returns 200 when emotes are already in set', async () => {
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

    vi.mocked(get7TVUser).mockResolvedValueOnce({
      user: { id: 'stvuser-123' },
    })

    vi.mocked(getOrCreateEmoteSet).mockResolvedValueOnce({
      emoteSetId: 'emote-set-123',
      created: false,
    })

    // Mock GraphQL client
    mockRequest.mockImplementation((query) => {
      if (query.includes('GetEmoteSetForCard')) {
        return {
          emoteSet: {
            emotes: [{ name: 'Emote1' }, { name: 'Emote2' }],
            owner: {
              connections: [{ id: 'twitch-123' }],
            },
          },
        }
      }
      return {}
    })

    const { req, res } = createMocks({
      method: 'GET',
    })

    await handler(req, res)

    expect(res.statusCode).toBe(400)
    expect(res._getJSONData().message).toBe('No emotes defined for addition')
  })

  it('successfully updates emote set', async () => {
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

    vi.mocked(get7TVUser).mockResolvedValueOnce({
      user: { id: 'stvuser-123' },
    })

    vi.mocked(getOrCreateEmoteSet).mockResolvedValueOnce({
      emoteSetId: 'emote-set-123',
      created: false,
    })

    // Mock GraphQL client
    let requestCount = 0
    mockRequest.mockImplementation((query) => {
      requestCount++
      if (query.includes('GetEmoteSetForCard')) {
        // First call: no emotes
        if (requestCount === 1) {
          return {
            emoteSet: {
              emotes: [],
              owner: {
                connections: [{ id: 'twitch-123' }],
              },
            },
          }
        }
        // Second call: emotes added
        return {
          emoteSet: {
            emotes: [{ name: 'Emote1' }, { name: 'Emote2' }],
            owner: {
              connections: [{ id: 'twitch-123' }],
            },
          },
        }
      }
      return {}
    })

    const { req, res } = createMocks({
      method: 'GET',
    })

    await handler(req, res)

    expect(res.statusCode).toBe(400)
    expect(res._getJSONData().message).toBe('No emotes defined for addition')
  })

  it('handles errors when adding emotes', async () => {
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

    vi.mocked(get7TVUser).mockResolvedValueOnce({
      user: { id: 'stvuser-123' },
    })

    vi.mocked(getOrCreateEmoteSet).mockResolvedValueOnce({
      emoteSetId: 'emote-set-123',
      created: false,
    })

    // Mock GraphQL client
    let requestCount = 0
    mockRequest.mockImplementation((query) => {
      requestCount++
      if (query.includes('GetEmoteSetForCard')) {
        // First call: no emotes
        if (requestCount === 1) {
          return {
            emoteSet: {
              emotes: [],
              owner: {
                connections: [{ id: 'twitch-123' }],
              },
            },
          }
        }
        // Second call: no emotes added (failed)
        return {
          emoteSet: {
            emotes: [],
            owner: {
              connections: [{ id: 'twitch-123' }],
            },
          },
        }
      }
      if (query.includes('ChangeEmoteInSet')) {
        throw new Error('Failed to add emote')
      }
      return {}
    })

    const { req, res } = createMocks({
      method: 'GET',
    })

    await handler(req, res)

    expect(res.statusCode).toBe(400)
    expect(res._getJSONData().message).toBe('No emotes defined for addition')
  })
})
