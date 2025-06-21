import { vi } from 'vitest'

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

// Prepare variable to capture GraphQL requests
export let mockRequest: ReturnType<typeof vi.fn>

// Mock GraphQL client and gql
vi.mock('graphql-request', () => {
  mockRequest = vi.fn()
  return {
    GraphQLClient: vi.fn().mockImplementation(() => ({
      request: mockRequest,
    })),
    gql: (query: string) => query,
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

// Import mocked modules so tests can use them
import { get7TVUser, getOrCreateEmoteSet } from '@/lib/7tv'
import { getServerSession } from '@/lib/api/getServerSession'
import { canAccessFeature, getSubscription } from '@/utils/subscription'
import { GraphQLClient } from 'graphql-request'

export {
  get7TVUser,
  getOrCreateEmoteSet,
  getServerSession,
  canAccessFeature,
  getSubscription,
  GraphQLClient,
}

export function setupEnv() {
  vi.stubEnv('SEVENTV_AUTH', 'test-auth-token')
  vi.stubEnv('TWITCH_CLIENT_ID', 'mock-client-id')
  vi.stubEnv('TWITCH_CLIENT_SECRET', 'mock-client-secret')
  mockRequest = vi.fn()
  vi.mocked(GraphQLClient).mockImplementation(
    () => ({ request: mockRequest }) as unknown as GraphQLClient,
  )
}

export function cleanupEnv() {
  vi.unstubAllEnvs()
}
