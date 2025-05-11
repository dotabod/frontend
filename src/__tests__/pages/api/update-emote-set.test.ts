import handler from '@/pages/api/update-emote-set'
import { createMocks } from 'node-mocks-http'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Mock the middleware
vi.mock('@/lib/api-middlewares/with-authentication', () => ({
  withAuthentication: (handler) => handler,
}))

// Mock prisma
vi.mock('@/lib/db', () => ({
  default: {
    subscription: {
      findMany: vi.fn(),
    },
  },
}))

// Mock next-auth
vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}))

// Mock auth options
vi.mock('@/lib/auth', () => ({
  authOptions: {},
}))

// Mock the 7TV library functions
vi.mock('@/lib/7tv', () => ({
  get7TVUser: vi.fn(),
  getOrCreateEmoteSet: vi.fn(),
}))

// Mock GraphQL client and gql
vi.mock('graphql-request', () => {
  const mockRequest = vi.fn()
  return {
    GraphQLClient: vi.fn().mockImplementation(() => ({
      request: mockRequest,
    })),
    gql: (query) => query,
  }
})

// Mock authentication
vi.mock('@/lib/api/getServerSession', () => ({
  getServerSession: vi.fn(),
}))

// Mock subscription utils
vi.mock('@/utils/subscription', () => ({
  getSubscription: vi.fn(),
  canAccessFeature: vi.fn(),
  SubscriptionTier: {
    FREE: 'FREE',
    PRO: 'PRO',
  },
}))

// Mock ChatBot emotes
vi.mock('@/components/Dashboard/ChatBot', () => ({
  emotesRequired: [
    { id: 'emote1', label: 'Emote1' },
    { id: 'emote2', label: 'Emote2' },
  ],
}))

// Mock getTwitchTokens to avoid environment variable issues
vi.mock('@/lib/getTwitchTokens', () => ({
  default: vi.fn().mockResolvedValue({
    access_token: 'mock-access-token',
    expires_in: 14400,
    token_type: 'bearer',
  }),
  CLIENT_ID: 'mock-client-id',
  CLIENT_SECRET: 'mock-client-secret',
}))

// Import mocked modules
import { get7TVUser, getOrCreateEmoteSet } from '@/lib/7tv'
import { getServerSession } from '@/lib/api/getServerSession'
import { canAccessFeature, getSubscription } from '@/utils/subscription'
import { GraphQLClient } from 'graphql-request'

describe('update-emote-set API', () => {
  let mockRequest: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.resetAllMocks()

    // Setup environment variables for testing
    vi.stubEnv('SEVENTV_AUTH', 'test-auth-token')
    vi.stubEnv('TWITCH_CLIENT_ID', 'mock-client-id')
    vi.stubEnv('TWITCH_CLIENT_SECRET', 'mock-client-secret')

    // Reset the mock request function
    mockRequest = vi.fn()
    vi.mocked(GraphQLClient).mockImplementation(
      () =>
        ({
          request: mockRequest,
        }) as unknown as GraphQLClient,
    )
  })

  afterEach(() => {
    // Restore original environment
    vi.unstubAllEnvs()
  })

  it('returns 403 when user is impersonating', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: {
        id: 'user-123',
        isImpersonating: true,
        name: 'Test User',
        image: 'image-url',
        twitchId: 'twitch-123',
        role: 'USER',
        locale: 'en-US',
        scope: 'test-scope',
      },
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    })

    const { req, res } = createMocks({
      method: 'GET',
    })

    await handler(req, res)

    expect(res.statusCode).toBe(403)
    expect(res._getJSONData()).toEqual({ message: 'Forbidden' })
  })

  it('returns 403 when user is not authenticated', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(null)

    const { req, res } = createMocks({
      method: 'GET',
    })

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
        role: 'USER',
        locale: 'en-US',
        scope: 'test-scope',
      },
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    })

    vi.mocked(getSubscription).mockResolvedValueOnce({
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
    })

    vi.mocked(canAccessFeature).mockReturnValueOnce({
      hasAccess: false,
      requiredTier: 'PRO',
    })

    const { req, res } = createMocks({
      method: 'GET',
    })

    await handler(req, res)

    expect(res.statusCode).toBe(403)
    expect(res._getJSONData()).toEqual({ message: 'Forbidden' })
  })

  it('returns 400 when Twitch ID is missing', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: {
        id: 'user-123',
        name: 'Test User',
        image: 'image-url',
        isImpersonating: false,
        twitchId: '',
        role: 'USER',
        locale: 'en-US',
        scope: 'test-scope',
      },
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    })

    vi.mocked(getSubscription).mockResolvedValueOnce({
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
    })

    vi.mocked(canAccessFeature).mockReturnValueOnce({
      hasAccess: true,
      requiredTier: 'PRO',
    })

    const { req, res } = createMocks({
      method: 'GET',
    })

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
        role: 'USER',
        locale: 'en-US',
        scope: 'test-scope',
      },
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    })

    vi.mocked(getSubscription).mockResolvedValueOnce({
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
    })

    vi.mocked(canAccessFeature).mockReturnValueOnce({
      hasAccess: true,
      requiredTier: 'PRO',
    })

    // Mock the ChatBot module
    vi.mock('@/components/Dashboard/ChatBot', () => ({
      emotesRequired: [],
    }))

    const { req, res } = createMocks({
      method: 'GET',
    })

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
        role: 'USER',
        locale: 'en-US',
        scope: 'test-scope',
      },
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    })

    vi.mocked(getSubscription).mockResolvedValueOnce({
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
    })

    vi.mocked(canAccessFeature).mockReturnValueOnce({
      hasAccess: true,
      requiredTier: 'PRO',
    })

    // Remove SEVENTV_AUTH
    vi.stubEnv('SEVENTV_AUTH', '')

    const { req, res } = createMocks({
      method: 'GET',
    })

    await handler(req, res)

    // Restore original value
    vi.unstubAllEnvs()

    expect(res.statusCode).toBe(400)
    expect(res._getJSONData()).toEqual({ message: 'No emotes defined for addition' })
  })

  it('returns 404 when 7TV user is not found', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: {
        id: 'user-123',
        twitchId: 'twitch-123',
        name: 'Test User',
        image: 'image-url',
        isImpersonating: false,
        role: 'USER',
        locale: 'en-US',
        scope: 'test-scope',
      },
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    })

    vi.mocked(getSubscription).mockResolvedValueOnce({
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
        role: 'USER',
        locale: 'en-US',
        scope: 'test-scope',
      },
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    })

    vi.mocked(getSubscription).mockResolvedValueOnce({
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
        role: 'USER',
        locale: 'en-US',
        scope: 'test-scope',
      },
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    })

    vi.mocked(getSubscription).mockResolvedValueOnce({
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
        role: 'USER',
        locale: 'en-US',
        scope: 'test-scope',
      },
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    })

    vi.mocked(getSubscription).mockResolvedValueOnce({
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
        role: 'USER',
        locale: 'en-US',
        scope: 'test-scope',
      },
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    })

    vi.mocked(getSubscription).mockResolvedValueOnce({
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
