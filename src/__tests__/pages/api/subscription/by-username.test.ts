import { createMocks } from 'node-mocks-http'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test'
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
      select: {
        id: true,
      },
      where: {
        name: 'nonexistentuser',
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
      beta_tester: false,
      createdAt: new Date(),
      currentViewers: null,
      displayName: null,
      email: null,
      emailVerified: null,
      followers: null,
      hideFromLeaderboard: false,
      id: 'user-123',
      image: null,
      kick: null,
      kickUsername: null,
      lastStreamCheck: null,
      locale: '',
      mmr: 0,
      name: '',
      proExpiration: null,
      steam32Id: null,
      streamCategory: null,
      streamPlatform: null,
      streamStartedAt: null,
      streamTitle: null,
      stream_delay: null,
      stream_online: false,
      stream_start_date: null,
      twitchUsername: null,
      updatedAt: new Date(),
      youtube: null,
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
      inGracePeriod: false,
      isGracePeriodPro: false,
      isLifetime: false,
      isPro: false,
      status: null,
      tier: SUBSCRIPTION_TIERS.FREE,
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
      beta_tester: false,
      createdAt: new Date(),
      currentViewers: null,
      displayName: null,
      email: null,
      emailVerified: null,
      followers: null,
      hideFromLeaderboard: false,
      id: 'user-456',
      image: null,
      kick: null,
      kickUsername: null,
      lastStreamCheck: null,
      locale: '',
      mmr: 0,
      name: '',
      proExpiration: null,
      steam32Id: null,
      streamCategory: null,
      streamPlatform: null,
      streamStartedAt: null,
      streamTitle: null,
      stream_delay: null,
      stream_online: false,
      stream_start_date: null,
      twitchUsername: null,
      updatedAt: new Date(),
      youtube: null,
      youtubeChannelId: null,
    })

    // Mock active PRO subscription
    vi.mocked(getSubscription).mockResolvedValueOnce({
      cancelAtPeriodEnd: false,
      createdAt: new Date(),
      currentPeriodEnd: null,
      giftDetails: null,
      id: 'sub_123',
      isGift: false,
      metadata: {},
      status: 'ACTIVE',
      stripeCustomerId: null,
      stripePriceId: null,
      stripeSubscriptionId: 'sub_123',
      tier: SUBSCRIPTION_TIERS.PRO,
      transactionType: 'RECURRING',
    })

    // Mock not in grace period
    vi.mocked(isInGracePeriod).mockReturnValueOnce(false)

    await handler(req, res)

    expect(getSubscription).toHaveBeenCalledWith('user-456')
    expect(res.statusCode).toBe(200)
    expect(res._getJSONData()).toEqual({
      inGracePeriod: false,
      isGracePeriodPro: false,
      isLifetime: false,
      isPro: true,
      status: 'ACTIVE',
      tier: SUBSCRIPTION_TIERS.PRO,
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
      beta_tester: false,
      createdAt: new Date(),
      currentViewers: null,
      displayName: null,
      email: null,
      emailVerified: null,
      followers: null,
      hideFromLeaderboard: false,
      id: 'user-789',
      image: null,
      kick: null,
      kickUsername: null,
      lastStreamCheck: null,
      locale: '',
      mmr: 0,
      name: '',
      proExpiration: null,
      steam32Id: null,
      streamCategory: null,
      streamPlatform: null,
      streamStartedAt: null,
      streamTitle: null,
      stream_delay: null,
      stream_online: false,
      stream_start_date: null,
      twitchUsername: null,
      updatedAt: new Date(),
      youtube: null,
      youtubeChannelId: null,
    })

    // Mock lifetime PRO subscription
    vi.mocked(getSubscription).mockResolvedValueOnce({
      cancelAtPeriodEnd: false,
      createdAt: new Date(),
      currentPeriodEnd: null,
      giftDetails: null,
      id: 'sub-123',
      isGift: false,
      metadata: {},
      status: 'ACTIVE',
      stripeCustomerId: null,
      stripePriceId: null,
      stripeSubscriptionId: null,
      tier: SUBSCRIPTION_TIERS.PRO,
      transactionType: 'LIFETIME',
    })

    // Mock not in grace period
    vi.mocked(isInGracePeriod).mockReturnValueOnce(false)

    await handler(req, res)

    expect(getSubscription).toHaveBeenCalledWith('user-789')
    expect(res.statusCode).toBe(200)
    expect(res._getJSONData()).toEqual({
      inGracePeriod: false,
      isGracePeriodPro: false,
      isLifetime: true,
      isPro: true,
      status: 'ACTIVE',
      tier: SUBSCRIPTION_TIERS.PRO,
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
      beta_tester: false,
      createdAt: new Date(),
      currentViewers: null,
      displayName: null,
      email: null,
      emailVerified: null,
      followers: null,
      hideFromLeaderboard: false,
      id: 'user-101',
      image: null,
      kick: null,
      kickUsername: null,
      lastStreamCheck: null,
      locale: '',
      mmr: 0,
      name: '',
      proExpiration: null,
      steam32Id: null,
      streamCategory: null,
      streamPlatform: null,
      streamStartedAt: null,
      streamTitle: null,
      stream_delay: null,
      stream_online: false,
      stream_start_date: null,
      twitchUsername: null,
      updatedAt: new Date(),
      youtube: null,
      youtubeChannelId: null,
    })
    // Mock gift PRO subscription
    vi.mocked(getSubscription).mockResolvedValueOnce({
      cancelAtPeriodEnd: false,
      createdAt: new Date(),
      currentPeriodEnd: null,
      giftDetails: {
        giftMessage: null,
        giftQuantity: 1,
        giftType: 'subscription',
        senderName: 'user-999',
      },
      id: 'sub_123',
      isGift: false,
      metadata: {},
      status: 'ACTIVE',
      stripeCustomerId: null,
      stripePriceId: null,
      stripeSubscriptionId: null,
      tier: SUBSCRIPTION_TIERS.PRO,
      transactionType: 'RECURRING',
    })

    // Mock not in grace period
    vi.mocked(isInGracePeriod).mockReturnValueOnce(false)

    await handler(req, res)

    expect(getSubscription).toHaveBeenCalledWith('user-101')
    expect(res.statusCode).toBe(200)
    expect(res._getJSONData()).toEqual({
      inGracePeriod: false,
      isGracePeriodPro: false,
      isLifetime: false,
      isPro: true,
      status: 'ACTIVE',
      tier: SUBSCRIPTION_TIERS.PRO,
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
      beta_tester: false,
      createdAt: new Date(),
      currentViewers: null,
      displayName: null,
      email: null,
      emailVerified: null,
      followers: null,
      hideFromLeaderboard: false,
      id: 'user-202',
      image: null,
      kick: null,
      kickUsername: null,
      lastStreamCheck: null,
      locale: '',
      mmr: 0,
      name: '',
      proExpiration: null,
      steam32Id: null,
      streamCategory: null,
      streamPlatform: null,
      streamStartedAt: null,
      streamTitle: null,
      stream_delay: null,
      stream_online: false,
      stream_start_date: null,
      twitchUsername: null,
      updatedAt: new Date(),
      youtube: null,
      youtubeChannelId: null,
    })
    // Mock FREE tier subscription
    vi.mocked(getSubscription).mockResolvedValueOnce({
      cancelAtPeriodEnd: false,
      createdAt: new Date(),
      currentPeriodEnd: null,
      giftDetails: null,
      id: 'subscription-123',
      isGift: false,
      metadata: {},
      status: null,
      stripeCustomerId: null,
      stripePriceId: null,
      stripeSubscriptionId: null,
      tier: SUBSCRIPTION_TIERS.FREE,
      transactionType: 'RECURRING' as const,
    })

    // Mock in grace period
    vi.mocked(isInGracePeriod).mockReturnValueOnce(true)

    await handler(req, res)

    expect(getSubscription).toHaveBeenCalledWith('user-202')
    expect(res.statusCode).toBe(200)
    expect(res._getJSONData()).toEqual({
      inGracePeriod: true,
      isGracePeriodPro: true,
      isLifetime: false,
      isPro: false,
      status: null,
      tier: SUBSCRIPTION_TIERS.FREE,
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
