// @ts-nocheck
import { createMocks } from 'node-mocks-http'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import handler from '@/pages/api/update-emote-set'

const mockChatBotModule = vi.hoisted(() => ({
  emotesRequired: [
    { id: 'emote1', label: 'Emote1' },
    { id: 'emote2', label: 'Emote2' },
  ],
}))

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
}))

// Mock GraphQL client and gql
vi.mock('graphql-request', () => {
  const mockRequest = vi.fn()
  function MockGraphQLClient(this: { request: typeof mockRequest }) {
    this.request = mockRequest
  }
  return {
    GraphQLClient: vi.fn(MockGraphQLClient),
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
  get emotesRequired() {
    return mockChatBotModule.emotesRequired
  },
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

import { GraphQLClient } from 'graphql-request'
// Import mocked modules
import { get7TVUser } from '@/lib/7tv'
import { getServerSession } from '@/lib/api/getServerSession'
import { canAccessFeature, getSubscription } from '@/utils/subscription'

describe('update-emote-set API', () => {
  let mockRequest: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.resetAllMocks()
    mockChatBotModule.emotesRequired = [
      { id: 'emote1', label: 'Emote1' },
      { id: 'emote2', label: 'Emote2' },
    ]

    // Setup environment variables for testing
    vi.stubEnv('SEVENTV_AUTH', 'test-auth-token')
    vi.stubEnv('TWITCH_CLIENT_ID', 'mock-client-id')
    vi.stubEnv('TWITCH_CLIENT_SECRET', 'mock-client-secret')

    // Reset the mock request function
    mockRequest = vi.fn()
    vi.mocked(GraphQLClient).mockImplementation(function (this: { request: typeof mockRequest }) {
      this.request = mockRequest
    } as unknown as new () => GraphQLClient)
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
        role: 'user',
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

    mockChatBotModule.emotesRequired = []

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

    // Remove SEVENTV_AUTH
    vi.stubEnv('SEVENTV_AUTH', '')

    const { req, res } = createMocks({
      method: 'GET',
    })

    await handler(req, res)

    expect(res.statusCode).toBe(500)
    expect(res._getJSONData()).toEqual({ message: 'Server configuration error' })
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

    expect(res.statusCode).toBe(404)
    expect(res._getJSONData().message).toBe('7TV user not found')
  })

  it('returns 400 when the 7TV user has no active emote set', async () => {
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

    const { req, res } = createMocks({
      method: 'GET',
    })

    await handler(req, res)

    expect(res.statusCode).toBe(400)
    expect(res._getJSONData().message).toBe('No active 7TV emote set found')
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
      emote_set: { id: 'active-set-123' },
    })

    // Mock GraphQL client
    mockRequest.mockImplementation((query, variables) => {
      const queryText = String(query)
      if (queryText.includes('GetEmoteSetForCard')) {
        expect(variables).toMatchObject({ id: 'active-set-123' })
        return {
          emoteSet: {
            emotes: [{ name: 'Emote1' }, { name: 'Emote2' }],
          },
        }
      }
      return {}
    })

    const { req, res } = createMocks({
      method: 'GET',
    })

    await handler(req, res)

    expect(res.statusCode).toBe(200)
    expect(res._getJSONData().message).toBe('Emote set already updated')
    const requestedQueries = mockRequest.mock.calls.map(([query]) => String(query))
    expect(requestedQueries.some((query) => query.includes('UpdateUserConnection'))).toBe(false)
    expect(requestedQueries.some((query) => query.includes('ChangeEmoteInSet'))).toBe(false)
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
      emote_set: { id: 'active-set-123' },
    })

    // Mock GraphQL client
    let getEmoteSetRequestCount = 0
    mockRequest.mockImplementation((query, variables) => {
      const queryText = String(query)
      if (queryText.includes('GetEmoteSetForCard')) {
        expect(variables).toMatchObject({ id: 'active-set-123' })
        getEmoteSetRequestCount++
        // First call: no emotes
        if (getEmoteSetRequestCount === 1) {
          return {
            emoteSet: {
              emotes: [],
            },
          }
        }
        // Second call: emotes added
        return {
          emoteSet: {
            emotes: [{ name: 'Emote1' }, { name: 'Emote2' }],
          },
        }
      }
      return {}
    })

    const { req, res } = createMocks({
      method: 'GET',
    })

    await handler(req, res)

    expect(res.statusCode).toBe(200)
    expect(res._getJSONData().message).toBe('Emote set updated successfully')
    const addEmoteCalls = mockRequest.mock.calls.filter(([query]) =>
      String(query).includes('ChangeEmoteInSet'),
    )
    expect(addEmoteCalls).toHaveLength(2)
    expect(addEmoteCalls[0][1]).toMatchObject({ id: 'active-set-123' })
    const requestedQueries = mockRequest.mock.calls.map(([query]) => String(query))
    expect(requestedQueries.some((query) => query.includes('UpdateUserConnection'))).toBe(false)
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
      emote_set: { id: 'active-set-123' },
    })

    // Mock GraphQL client
    let getEmoteSetRequestCount = 0
    mockRequest.mockImplementation((query, variables) => {
      const queryText = String(query)
      if (queryText.includes('GetEmoteSetForCard')) {
        expect(variables).toMatchObject({ id: 'active-set-123' })
        getEmoteSetRequestCount++
        // First call: no emotes
        if (getEmoteSetRequestCount === 1) {
          return {
            emoteSet: {
              emotes: [],
            },
          }
        }
        // Second call: no emotes added (failed)
        return {
          emoteSet: {
            emotes: [],
          },
        }
      }
      if (queryText.includes('ChangeEmoteInSet')) {
        throw new Error('Failed to add emote')
      }
      return {}
    })

    const { req, res } = createMocks({
      method: 'GET',
    })

    await handler(req, res)

    expect(res.statusCode).toBe(500)
    expect(res._getJSONData()).toMatchObject({
      message: 'Failed to add some emotes',
      missingEmotes: ['Emote1', 'Emote2'],
    })
  })
})
