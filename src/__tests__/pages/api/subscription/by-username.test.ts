import { createMocks } from 'node-mocks-http'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import handler from '@/pages/api/subscription/by-username'

// Mock prisma
vi.mock('@/lib/db', () => ({
  default: {
    user: {
      findFirst: vi.fn(),
    },
  },
}))

// Mock subscription utilities
vi.mock('@/utils/subscription', () => ({
  SUBSCRIPTION_TIERS: {
    FREE: 'FREE',
    PRO: 'PRO',
  },
  getSubscription: vi.fn(),
  isInGracePeriod: vi.fn(),
}))

// Import mocked modules
import prisma from '@/lib/db'
import { getSubscription, isInGracePeriod, SUBSCRIPTION_TIERS } from '@/utils/subscription'

describe('subscription/by-username API', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('returns 400 when username is missing', async () => {
    const { req, res } = createMocks({
      method: 'GET',
      query: {},
    })

    await handler(req, res)

    expect(res.statusCode).toBe(400)
    expect(res._getJSONData()).toEqual({ error: 'Username is required' })
  })

  it('returns 404 when user is not found', async () => {
    const { req, res } = createMocks({
      method: 'GET',
      query: {
        username: 'nonexistentuser',
      },
    })

    // Mock user not found
    vi.mocked(prisma.user.findFirst).mockResolvedValueOnce(null)

    await handler(req, res)

    expect(prisma.user.findFirst).toHaveBeenCalledWith({
      where: {
        name: 'nonexistentuser',
      },
      select: {
        id: true,
      },
    })
    expect(res.statusCode).toBe(404)
    expect(res._getJSONData()).toEqual({ error: 'User not found' })
  })

  it('returns FREE tier when user has no subscription', async () => {
    const { req, res } = createMocks({
      method: 'GET',
      query: {
        username: 'testuser',
      },
    })

    // Mock user found
    vi.mocked(prisma.user.findFirst).mockResolvedValueOnce({
      id: 'user-123',
      createdAt: new Date(),
      updatedAt: new Date(),
      name: '',
      displayName: null,
      email: null,
      image: null,
      mmr: 0,
      steam32Id: null,
      followers: null,
      stream_delay: null,
      emailVerified: null,
      stream_online: false,
      stream_start_date: null,
      beta_tester: false,
      locale: '',
      kick: null,
      youtube: null,
      proExpiration: null,
      currentViewers: null,
      hideFromLeaderboard: false,
      lastStreamCheck: null,
      streamPlatform: null,
      twitchUsername: null,
      kickUsername: null,
      streamCategory: null,
      streamStartedAt: null,
      streamTitle: null,
      youtubeChannelId: null,
    })

    // Mock no subscription found
    vi.mocked(getSubscription).mockResolvedValueOnce(null)

    // Mock not in grace period
    vi.mocked(isInGracePeriod).mockReturnValueOnce(false)

    await handler(req, res)

    expect(getSubscription).toHaveBeenCalledWith('user-123')
    expect(isInGracePeriod).toHaveBeenCalled()
    expect(res.statusCode).toBe(200)
    expect(res._getJSONData()).toEqual({
      tier: SUBSCRIPTION_TIERS.FREE,
      status: null,
      isPro: false,
      isGracePeriodPro: false,
      isLifetime: false,
      inGracePeriod: false,
    })
  })

  it('returns PRO tier for active subscription', async () => {
    const { req, res } = createMocks({
      method: 'GET',
      query: {
        username: 'prouser',
      },
    })

    // Mock user found
    vi.mocked(prisma.user.findFirst).mockResolvedValueOnce({
      id: 'user-456',
      createdAt: new Date(),
      updatedAt: new Date(),
      name: '',
      displayName: null,
      email: null,
      image: null,
      mmr: 0,
      steam32Id: null,
      followers: null,
      stream_delay: null,
      emailVerified: null,
      stream_online: false,
      stream_start_date: null,
      beta_tester: false,
      locale: '',
      kick: null,
      youtube: null,
      proExpiration: null,
      currentViewers: null,
      hideFromLeaderboard: false,
      lastStreamCheck: null,
      streamPlatform: null,
      twitchUsername: null,
      kickUsername: null,
      streamCategory: null,
      streamStartedAt: null,
      streamTitle: null,
      youtubeChannelId: null,
    })

    // Mock active PRO subscription
    vi.mocked(getSubscription).mockResolvedValueOnce({
      tier: SUBSCRIPTION_TIERS.PRO,
      status: 'ACTIVE',
      id: 'sub_123',
      stripeSubscriptionId: 'sub_123',
      transactionType: 'RECURRING',
      createdAt: new Date(),
      stripeCustomerId: null,
      stripePriceId: null,
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
      giftDetails: null,
      metadata: {},
      isGift: false,
    })

    // Mock not in grace period
    vi.mocked(isInGracePeriod).mockReturnValueOnce(false)

    await handler(req, res)

    expect(getSubscription).toHaveBeenCalledWith('user-456')
    expect(res.statusCode).toBe(200)
    expect(res._getJSONData()).toEqual({
      tier: SUBSCRIPTION_TIERS.PRO,
      status: 'ACTIVE',
      isPro: true,
      isGracePeriodPro: false,
      isLifetime: false,
      inGracePeriod: false,
    })
  })

  it('returns PRO tier for lifetime subscription', async () => {
    const { req, res } = createMocks({
      method: 'GET',
      query: {
        username: 'lifetimeuser',
      },
    })

    // Mock user found
    vi.mocked(prisma.user.findFirst).mockResolvedValueOnce({
      id: 'user-789',
      createdAt: new Date(),
      updatedAt: new Date(),
      name: '',
      displayName: null,
      email: null,
      image: null,
      mmr: 0,
      steam32Id: null,
      followers: null,
      stream_delay: null,
      emailVerified: null,
      stream_online: false,
      stream_start_date: null,
      beta_tester: false,
      locale: '',
      kick: null,
      youtube: null,
      proExpiration: null,
      currentViewers: null,
      hideFromLeaderboard: false,
      lastStreamCheck: null,
      streamPlatform: null,
      twitchUsername: null,
      kickUsername: null,
      streamCategory: null,
      streamStartedAt: null,
      streamTitle: null,
      youtubeChannelId: null,
    })

    // Mock lifetime PRO subscription
    vi.mocked(getSubscription).mockResolvedValueOnce({
      tier: SUBSCRIPTION_TIERS.PRO,
      id: 'sub-123',
      status: 'ACTIVE',
      stripeSubscriptionId: null,
      transactionType: 'LIFETIME',
      createdAt: new Date(),
      stripeCustomerId: null,
      stripePriceId: null,
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
      giftDetails: null,
      metadata: {},
      isGift: false,
    })

    // Mock not in grace period
    vi.mocked(isInGracePeriod).mockReturnValueOnce(false)

    await handler(req, res)

    expect(getSubscription).toHaveBeenCalledWith('user-789')
    expect(res.statusCode).toBe(200)
    expect(res._getJSONData()).toEqual({
      tier: SUBSCRIPTION_TIERS.PRO,
      status: 'ACTIVE',
      isPro: true,
      isGracePeriodPro: false,
      isLifetime: true,
      inGracePeriod: false,
    })
  })

  it('returns PRO tier for gift subscription', async () => {
    const { req, res } = createMocks({
      method: 'GET',
      query: {
        username: 'giftuser',
      },
    })

    // Mock user found
    vi.mocked(prisma.user.findFirst).mockResolvedValueOnce({
      id: 'user-101',
      createdAt: new Date(),
      updatedAt: new Date(),
      name: '',
      displayName: null,
      email: null,
      image: null,
      mmr: 0,
      steam32Id: null,
      followers: null,
      stream_delay: null,
      emailVerified: null,
      stream_online: false,
      stream_start_date: null,
      beta_tester: false,
      locale: '',
      kick: null,
      youtube: null,
      proExpiration: null,
      currentViewers: null,
      hideFromLeaderboard: false,
      lastStreamCheck: null,
      streamPlatform: null,
      twitchUsername: null,
      kickUsername: null,
      streamCategory: null,
      streamStartedAt: null,
      streamTitle: null,
      youtubeChannelId: null,
    })
    // Mock gift PRO subscription
    vi.mocked(getSubscription).mockResolvedValueOnce({
      id: 'sub_123',
      tier: SUBSCRIPTION_TIERS.PRO,
      status: 'ACTIVE',
      stripeSubscriptionId: null,
      transactionType: 'RECURRING',
      createdAt: new Date(),
      stripeCustomerId: null,
      stripePriceId: null,
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
      giftDetails: {
        senderName: 'user-999',
        giftMessage: null,
        giftType: 'subscription',
        giftQuantity: 1,
      },
      metadata: {},
      isGift: false,
    })

    // Mock not in grace period
    vi.mocked(isInGracePeriod).mockReturnValueOnce(false)

    await handler(req, res)

    expect(getSubscription).toHaveBeenCalledWith('user-101')
    expect(res.statusCode).toBe(200)
    expect(res._getJSONData()).toEqual({
      tier: SUBSCRIPTION_TIERS.PRO,
      status: 'ACTIVE',
      isPro: true,
      isGracePeriodPro: false,
      isLifetime: false,
      inGracePeriod: false,
    })
  })

  it('returns grace period PRO tier when in grace period without paid plan', async () => {
    const { req, res } = createMocks({
      method: 'GET',
      query: {
        username: 'graceuser',
      },
    })

    // Mock user found
    vi.mocked(prisma.user.findFirst).mockResolvedValueOnce({
      id: 'user-202',
      createdAt: new Date(),
      updatedAt: new Date(),
      name: '',
      displayName: null,
      email: null,
      image: null,
      mmr: 0,
      steam32Id: null,
      followers: null,
      stream_delay: null,
      emailVerified: null,
      stream_online: false,
      stream_start_date: null,
      beta_tester: false,
      locale: '',
      kick: null,
      youtube: null,
      proExpiration: null,
      currentViewers: null,
      hideFromLeaderboard: false,
      lastStreamCheck: null,
      streamPlatform: null,
      twitchUsername: null,
      kickUsername: null,
      streamCategory: null,
      streamStartedAt: null,
      streamTitle: null,
      youtubeChannelId: null,
    })
    // Mock FREE tier subscription
    vi.mocked(getSubscription).mockResolvedValueOnce({
      id: 'subscription-123',
      tier: SUBSCRIPTION_TIERS.FREE,
      status: null,
      stripeSubscriptionId: null,
      transactionType: 'RECURRING' as const,
      stripeCustomerId: null,
      stripePriceId: null,
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
      createdAt: new Date(),
      giftDetails: null,
      metadata: {},
      isGift: false,
    })

    // Mock in grace period
    vi.mocked(isInGracePeriod).mockReturnValueOnce(true)

    await handler(req, res)

    expect(getSubscription).toHaveBeenCalledWith('user-202')
    expect(res.statusCode).toBe(200)
    expect(res._getJSONData()).toEqual({
      tier: SUBSCRIPTION_TIERS.FREE,
      status: null,
      isPro: false,
      isGracePeriodPro: true,
      isLifetime: false,
      inGracePeriod: true,
    })
  })

  it('handles server errors', async () => {
    const { req, res } = createMocks({
      method: 'GET',
      query: {
        username: 'erroruser',
      },
    })

    // Mock error
    vi.mocked(prisma.user.findFirst).mockRejectedValueOnce(new Error('Database error'))

    await handler(req, res)

    expect(res.statusCode).toBe(500)
    expect(res._getJSONData()).toEqual({ error: 'Internal Server Error' })
  })
})
