import type { SubscriptionStatus, SubscriptionTier } from '@prisma/client'
import type { NextApiHandler } from 'next'
import type { Session } from 'next-auth'
import { createMocks } from 'node-mocks-http'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test'
import handler from '@/pages/api/install/[token]'

// Mock the auth module to prevent environment variable checks
vi.mock('@/lib/auth', () => ({
  authOptions: {},
}))

// Mock the prisma client
vi.mock('@/lib/db', () => ({
  default: {
    user: {
      findFirstOrThrow: vi.fn(),
    },
  },
}))

// Mock Sentry
vi.mock('@sentry/nextjs', () => ({
  captureException: vi.fn(),
}))

// Mock the withMethods middleware
vi.mock('@/lib/api-middlewares/with-methods', () => ({
  withMethods: (_methods: string[], handler: NextApiHandler) => handler,
}))

// Mock the withAuthentication middleware
vi.mock('@/lib/api-middlewares/with-authentication', () => ({
  withAuthentication: (handler: NextApiHandler) => handler,
}))

// Mock the getServerSession function
vi.mock('@/lib/api/getServerSession', () => ({
  getServerSession: vi.fn(),
}))

// Mock the subscription utilities
vi.mock('@/utils/subscription', () => ({
  canAccessFeature: vi.fn(),
  getSubscription: vi.fn(),
}))

import { captureException } from '@sentry/nextjs'
import { getServerSession } from '@/lib/api/getServerSession'
// Import the mocked modules
import prisma from '@/lib/db'
import { canAccessFeature, getSubscription } from '@/utils/subscription'

describe('install/[token] API', () => {
  beforeEach(() => {
    vi.resetAllMocks()

    // Setup environment variables
    vi.stubEnv('TWITCH_CLIENT_ID', 'mock-client-id')
    vi.stubEnv('TWITCH_CLIENT_SECRET', 'mock-client-secret')
    vi.stubEnv('NEXT_PUBLIC_GSI_WEBSOCKET_URL', 'wss://test-websocket-url.com')
  })

  afterEach(() => {
    vi.clearAllMocks()

    // Clean up environment variables
    vi.unstubAllEnvs()
  })

  it('returns 403 when user is impersonating', async () => {
    const { req, res } = createMocks({
      method: 'GET',
      query: {
        token: 'test-token',
      },
    })

    vi.mocked(getServerSession).mockResolvedValue({
      user: {
        id: 'user-id',
        isImpersonating: true,
      },
    } as Session)

    await handler(req, res)

    expect(res.statusCode).toBe(403)
    expect(res._getJSONData()).toEqual({ message: 'Forbidden' })
  })

  it('returns 403 when no userId is provided', async () => {
    const { req, res } = createMocks({
      method: 'GET',
      query: {
        token: '',
      },
    })

    vi.mocked(getServerSession).mockResolvedValue({
      user: {
        id: '',
      },
    } as Session)

    await handler(req, res)

    expect(res.statusCode).toBe(403)
    expect(res._getJSONData()).toEqual({ message: 'Unauthorized' })
  })

  it('returns 403 when user does not have access to the feature', async () => {
    const { req, res } = createMocks({
      method: 'GET',
      query: {
        token: 'test-token',
      },
    })

    vi.mocked(getServerSession).mockResolvedValue({
      user: {
        id: 'user-id',
        isImpersonating: false,
      },
    } as Session)
    // Use proper type for subscription
    vi.mocked(getSubscription).mockResolvedValue({
      cancelAtPeriodEnd: false,
      createdAt: new Date(),
      currentPeriodEnd: null,
      giftDetails: null,
      id: 'subscription-id',
      isGift: false,
      metadata: {},
      status: 'ACTIVE' as const,
      stripeCustomerId: null,
      stripePriceId: null,
      stripeSubscriptionId: null,
      tier: 'FREE' as const,
      transactionType: 'RECURRING' as const,
    })

    vi.mocked(canAccessFeature).mockReturnValue({
      hasAccess: false,
      requiredTier: 'PRO' as SubscriptionTier,
    })

    await handler(req, res)

    expect(getSubscription).toHaveBeenCalledWith('test-token')
    expect(canAccessFeature).toHaveBeenCalledWith('autoInstaller', expect.anything())
    expect(res.statusCode).toBe(403)
    expect(res._getJSONData()).toEqual({
      error: 'This feature requires a subscription',
      requiredTier: 'PRO',
    })
  })

  it('returns 500 when database query fails', async () => {
    const { req, res } = createMocks({
      method: 'GET',
      query: {
        token: 'test-token',
      },
    })

    vi.mocked(getServerSession).mockResolvedValue({
      user: {
        id: 'user-id',
        isImpersonating: false,
      },
    } as Session)
    // Use proper type for subscription
    vi.mocked(getSubscription).mockResolvedValue({
      cancelAtPeriodEnd: false,
      createdAt: new Date(),
      currentPeriodEnd: null,
      giftDetails: null,
      id: 'subscription-id',
      isGift: false,
      metadata: {},
      status: 'ACTIVE' as const,
      stripeCustomerId: null,
      stripePriceId: null,
      stripeSubscriptionId: null,
      tier: 'PRO' as const,
      transactionType: 'RECURRING' as const,
    })

    vi.mocked(canAccessFeature).mockReturnValue({
      hasAccess: true,
      requiredTier: 'FREE' as SubscriptionTier,
    })

    const mockError = new Error('Database error')
    vi.mocked(prisma.user.findFirstOrThrow).mockRejectedValue(mockError)

    await handler(req, res)

    expect(prisma.user.findFirstOrThrow).toHaveBeenCalledWith({
      select: {
        name: true,
      },
      where: {
        id: 'test-token',
      },
    })
    expect(captureException).toHaveBeenCalledWith(mockError)
    expect(res.statusCode).toBe(500)
    expect(res._getJSONData()).toEqual({ error: 'Database error', message: 'Failed to get info' })
  })

  it('returns the config file when user has access', async () => {
    const { req, res } = createMocks({
      method: 'GET',
      query: {
        token: 'test-token',
      },
    })

    vi.mocked(getServerSession).mockResolvedValue({
      user: {
        id: 'user-id',
        isImpersonating: false,
      },
    } as Session)

    // Use proper type for subscription
    vi.mocked(getSubscription).mockResolvedValue({
      cancelAtPeriodEnd: false,
      createdAt: new Date(),
      currentPeriodEnd: null,
      giftDetails: null,
      id: 'subscription-id',
      isGift: false,
      metadata: {},
      status: 'ACTIVE' as SubscriptionStatus,
      stripeCustomerId: null,
      stripePriceId: null,
      stripeSubscriptionId: null,
      tier: 'PRO' as SubscriptionTier,
      transactionType: 'RECURRING' as const,
    })

    vi.mocked(canAccessFeature).mockReturnValue({
      hasAccess: true,
      requiredTier: 'FREE' as SubscriptionTier,
    })

    // Mock the user with required properties
    vi.mocked(prisma.user.findFirstOrThrow).mockResolvedValue({
      beta_tester: false,
      createdAt: new Date(),
      currentViewers: null,
      displayName: null,
      email: null,
      emailVerified: null,
      followers: null,
      hideFromLeaderboard: false,
      id: 'test-token',
      image: null,
      kick: null,
      kickUsername: null,
      lastStreamCheck: null,
      locale: 'en',
      mmr: 0,
      name: 'testuser',
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

    await handler(req, res)

    expect(prisma.user.findFirstOrThrow).toHaveBeenCalledWith({
      select: {
        name: true,
      },
      where: {
        id: 'test-token',
      },
    })

    expect(res._getHeaders()['content-disposition']).toBe(
      'attachment; filename="gamestate_integration_dotabod-testuser.cfg"',
    )
    expect(res._getHeaders()['content-type']).toBe('text/plain')
    expect(res.statusCode).toBe(200)

    const expectedFileContent = `"Dotabod Configuration"
{
  "uri" "wss://test-websocket-url.com"
  "timeout" "5.0"
  "buffer" "0.5"
  "throttle" "0.5"
  "heartbeat" "30.0"
  "data"
  {
    "abilities" "1"
    "buildings" "1"
    "events" "1"
    "hero" "1"
    "items" "1"
    "map" "1"
    "player" "1"
    "provider" "1"
    "wearables" "1"
  }
  "auth"
  {
    "token" "test-token"
  }
}
`
    expect(res._getData()).toBe(expectedFileContent)
  })

  it('uses token from query params over session user id', async () => {
    const { req, res } = createMocks({
      method: 'GET',
      query: {
        token: 'query-token',
      },
    })

    vi.mocked(getServerSession).mockResolvedValue({
      user: {
        id: 'session-user-id',
        isImpersonating: false,
      },
    } as Session)

    // Use proper type for subscription
    vi.mocked(getSubscription).mockResolvedValue({
      cancelAtPeriodEnd: false,
      createdAt: new Date(),
      currentPeriodEnd: null,
      giftDetails: null,
      id: 'subscription-id',
      isGift: false,
      metadata: {},
      status: 'ACTIVE' as SubscriptionStatus,
      stripeCustomerId: null,
      stripePriceId: null,
      stripeSubscriptionId: null,
      tier: 'PRO' as SubscriptionTier,
      transactionType: 'RECURRING' as const,
    })

    vi.mocked(canAccessFeature).mockReturnValue({
      hasAccess: true,
      requiredTier: 'FREE' as SubscriptionTier,
    })

    // Mock the user with required properties
    vi.mocked(prisma.user.findFirstOrThrow).mockResolvedValue({
      beta_tester: false,
      createdAt: new Date(),
      currentViewers: null,
      displayName: null,
      email: null,
      emailVerified: null,
      followers: null,
      hideFromLeaderboard: false,
      id: 'query-token',
      image: null,
      kick: null,
      kickUsername: null,
      lastStreamCheck: null,
      locale: 'en',
      mmr: 0,
      name: 'queryuser',
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

    await handler(req, res)

    expect(getSubscription).toHaveBeenCalledWith('query-token')
    expect(prisma.user.findFirstOrThrow).toHaveBeenCalledWith({
      select: {
        name: true,
      },
      where: {
        id: 'query-token',
      },
    })
  })
})
