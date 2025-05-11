import handler from '@/pages/api/update-followers'
import { createMocks } from 'node-mocks-http'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Mock the middleware
vi.mock('@/lib/api-middlewares/with-authentication', () => ({
  withAuthentication: (handler) => handler,
}))

vi.mock('@/lib/api-middlewares/with-methods', () => ({
  withMethods: (methods, handler) => (req, res) => {
    if (!methods.includes(req.method)) {
      res.status(405).json({ message: 'Method not allowed' })
      return
    }
    return handler(req, res)
  },
}))

// Mock the Prisma client
vi.mock('@/lib/db', () => ({
  default: {
    user: {
      update: vi.fn(),
    },
  },
}))

// Mock the Twitch tokens
vi.mock('@/lib/getTwitchTokens', () => ({
  getTwitchTokens: vi.fn(),
}))

// Mock fetch for Twitch API
global.fetch = vi.fn()

// Mock Sentry
vi.mock('@sentry/nextjs', () => ({
  captureException: vi.fn(),
}))

// Mock the authentication
vi.mock('@/lib/api/getServerSession', () => ({
  getServerSession: vi.fn(),
}))

vi.mock('@/lib/auth', () => ({
  authOptions: {},
}))

import { getServerSession } from '@/lib/api/getServerSession'
import prisma from '@/lib/db'
import { getTwitchTokens } from '@/lib/getTwitchTokens'
import { captureException } from '@sentry/nextjs'

describe('update-followers API', () => {
  beforeEach(() => {
    vi.resetAllMocks()

    // Setup environment variables
    vi.stubEnv('TWITCH_CLIENT_ID', 'mock-client-id')
  })

  afterEach(() => {
    vi.clearAllMocks()

    // Clean up environment variables
    vi.unstubAllEnvs()
  })

  it('returns 405 for non-GET methods', async () => {
    const { req, res } = createMocks({
      method: 'POST',
    })

    await handler(req, res)

    expect(res.statusCode).toBe(405)
    expect(res._getJSONData()).toEqual({ message: 'Method not allowed' })
  })

  it('returns 403 when user is not authenticated', async () => {
    const { req, res } = createMocks({
      method: 'GET',
    })

    // Mock getSession to return null (not authenticated)
    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: null,
    })

    await handler(req, res)

    expect(res.statusCode).toBe(403)
  })

  it('returns 403 when user is impersonating', async () => {
    const { req, res } = createMocks({
      method: 'GET',
    })

    // Mock getSession to return a user who is impersonating
    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: {
        id: 'user-123',
        isImpersonating: true,
      },
    })

    await handler(req, res)

    expect(res.statusCode).toBe(403)
    expect(res._getJSONData()).toEqual({ message: 'Forbidden' })
  })

  it('successfully updates followers', async () => {
    const { req, res } = createMocks({
      method: 'GET',
    })

    // Mock getSession to return a user
    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: {
        id: 'user-123',
        isImpersonating: false,
      },
    })
    // Mock getTwitchTokens to return tokens
    vi.mocked(getTwitchTokens).mockResolvedValueOnce({
      providerAccountId: '12345',
      accessToken: 'mock-access-token',
    })

    // Mock fetch response for follower count
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ total: 100 }),
    } as any)

    // Mock prisma.user.update
    vi.mocked(prisma.user.update).mockResolvedValueOnce({
      id: 'user-123',
      followers: 100,
    } as any)

    await handler(req, res)

    expect(res.statusCode).toBe(200)
    expect(res._getData()).toBe('Followers updated successfully')

    expect(getTwitchTokens).toHaveBeenCalledWith('user-123')
    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.twitch.tv/helix/channels/followers?broadcaster_id=12345',
      {
        headers: {
          Authorization: 'Bearer mock-access-token',
          'Client-Id': 'mock-client-id',
        },
      },
    )
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'user-123' },
      data: { followers: 100 },
    })
  })

  it('handles Twitch API errors gracefully', async () => {
    const { req, res } = createMocks({
      method: 'GET',
    })

    // Mock getSession to return a user
    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: {
        id: 'user-123',
        isImpersonating: false,
      },
    })
    // Mock getTwitchTokens to return tokens
    vi.mocked(getTwitchTokens).mockResolvedValueOnce({
      providerAccountId: '12345',
      accessToken: 'mock-access-token',
    })

    // Mock fetch response with error
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: false,
      statusText: 'Unauthorized',
    } as any)

    await handler(req, res)

    expect(res.statusCode).toBe(200)
    expect(res._getData()).toBe('Followers updated successfully')

    expect(getTwitchTokens).toHaveBeenCalledWith('user-123')
    expect(global.fetch).toHaveBeenCalled()
    expect(captureException).toHaveBeenCalled()
  })

  it('handles Twitch token errors gracefully', async () => {
    const { req, res } = createMocks({
      method: 'GET',
    })

    // Mock getSession to return a user
    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: {
        id: 'user-123',
        isImpersonating: false,
      },
    })

    // Mock getTwitchTokens to return an error
    vi.mocked(getTwitchTokens).mockResolvedValueOnce({
      providerAccountId: null,
      accessToken: null,
      error: 'Failed to get Twitch tokens',
    })

    await handler(req, res)

    expect(res.statusCode).toBe(200)
    expect(res._getData()).toBe('Followers updated successfully')

    expect(getTwitchTokens).toHaveBeenCalledWith('user-123')
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('handles unexpected errors', async () => {
    const { req, res } = createMocks({
      method: 'GET',
    })

    // Mock console.error to prevent test output noise
    const originalConsoleError = console.error
    console.error = vi.fn()

    // Mock getServerSession to return a user
    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: {
        id: 'user-123',
        isImpersonating: false,
      },
    })

    // Mock getTwitchTokens to throw an error
    vi.mocked(getTwitchTokens).mockImplementationOnce(() => {
      throw new Error('Unexpected error')
    })

    await handler(req, res)

    // Restore console.error
    console.error = originalConsoleError

    expect(res.statusCode).toBe(500)
    expect(res._getData()).toBe('Failed to update followers')

    expect(captureException).toHaveBeenCalled()
  })
})
