import { createMocks } from 'node-mocks-http'
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import handler from '@/pages/api/test-emote-set'

// Import types first
import type { EmoteSetResponse } from '@/lib/7tv'

// Mock modules with vi.mock
vi.mock('@/lib/api-middlewares/with-methods', () => ({
  withMethods: (methods, handler) => (req, res) => {
    if (!methods.includes(req.method)) {
      res.status(405).json({ message: 'Method not allowed' })
      return
    }
    return handler(req, res)
  },
}))

vi.mock('@/lib/7tv', () => ({
  create7TVClient: vi.fn(() => 'mock-client'),
  get7TVUser: vi.fn(),
  getOrCreateEmoteSet: vi.fn(),
  isSevenTVError: vi.fn(),
  verifyEmoteInSet: vi.fn(),
}))

vi.mock('@/lib/gql', () => ({
  CHANGE_EMOTE_IN_SET: 'mock-change-emote-query',
  DELETE_EMOTE_SET: 'mock-delete-emote-set-query',
}))

vi.mock('@sentry/nextjs', () => ({
  captureException: vi.fn(),
  withScope: vi.fn((callback) => callback({ setTag: vi.fn(), setContext: vi.fn() })),
}))

// Import mocked modules after vi.mock declarations
import {
  create7TVClient,
  get7TVUser,
  getOrCreateEmoteSet,
  isSevenTVError,
  verifyEmoteInSet,
} from '@/lib/7tv'
import { captureException, withScope } from '@sentry/nextjs'

describe('test-emote-set API', () => {
  beforeEach(() => {
    // Reset all mocks before each test
    vi.resetAllMocks()

    // Setup environment variables using vi.stubEnv
    vi.stubEnv('NODE_ENV', 'development')
    vi.stubEnv('CRON_SECRET', 'test-secret')
    vi.stubEnv('CRON_TWITCH_ID', 'test-twitch-id')
    vi.stubEnv('SEVENTV_AUTH', 'test-auth-token')
  })

  afterEach(() => {
    // Clean up after each test
    vi.clearAllMocks()
    vi.unstubAllEnvs()
  })

  it('returns 401 when authorization header is missing in production', async () => {
    // Set environment for this specific test
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('VERCEL_ENV', 'production')

    const { req, res } = createMocks({
      method: 'GET',
    })

    await handler(req, res)

    expect(res.statusCode).toBe(401)
    expect(res._getJSONData()).toEqual({ success: false })
  })

  it('returns 401 when authorization header is invalid in production', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('VERCEL_ENV', 'production')

    const { req, res } = createMocks({
      method: 'GET',
      headers: {
        authorization: 'Bearer invalid-secret',
      },
    })

    await handler(req, res)

    expect(res.statusCode).toBe(401)
    expect(res._getJSONData()).toEqual({ success: false })
  })

  it('returns 405 for non-GET methods', async () => {
    const { req, res } = createMocks({
      method: 'POST',
    })

    await handler(req, res)

    expect(res.statusCode).toBe(405)
    expect(res._getJSONData()).toEqual({ message: 'Method not allowed' })
  })

  it('returns 403 when CRON_TWITCH_ID is missing', async () => {
    // Use vi.stubEnv with undefined instead of delete operator
    vi.stubEnv('CRON_TWITCH_ID', undefined)

    const { req, res } = createMocks({
      method: 'GET',
    })

    await handler(req, res)

    expect(res.statusCode).toBe(403)
    expect(res._getJSONData()).toEqual({ message: 'Forbidden' })
  })

  it('returns 500 when SEVENTV_AUTH is missing', async () => {
    // Use vi.stubEnv with undefined instead of delete operator
    vi.stubEnv('SEVENTV_AUTH', undefined)

    const { req, res } = createMocks({
      method: 'GET',
    })

    await handler(req, res)

    expect(res.statusCode).toBe(500)
    expect(res._getJSONData()).toEqual({ message: 'Server configuration error' })
  })

  it('returns 200 when user lacks permission to use personal emote sets', async () => {
    const { req, res } = createMocks({
      method: 'GET',
    })

    // Mock get7TVUser to return a user
    vi.mocked(get7TVUser).mockResolvedValueOnce({
      user: { id: 'test-user-id' },
    })

    // Mock getOrCreateEmoteSet to throw a permission error
    vi.mocked(getOrCreateEmoteSet).mockRejectedValueOnce(
      new Error('User does not have permission to use personal emote sets'),
    )

    await handler(req, res)

    expect(res.statusCode).toBe(200)
    expect(res._getJSONData()).toEqual({ message: 'Test skipped - user lacks permissions' })
    expect(get7TVUser).toHaveBeenCalledWith('test-twitch-id')
    expect(getOrCreateEmoteSet).toHaveBeenCalled()
  })

  it('returns 200 when user lacks permission to modify emote sets', async () => {
    const { req, res } = createMocks({
      method: 'GET',
    })

    // Mock get7TVUser to return a user
    vi.mocked(get7TVUser).mockResolvedValueOnce({
      user: { id: 'test-user-id' },
    })

    // Mock getOrCreateEmoteSet to return an emote set
    vi.mocked(getOrCreateEmoteSet).mockResolvedValueOnce({
      emoteSetId: 'test-emote-set-id',
      created: true,
    })

    // Mock client.request to throw a permission error
    const mockClient = {
      request: vi.fn().mockRejectedValueOnce({
        response: {
          errors: [{ extensions: { code: 'LACKING_PRIVILEGES' } }],
        },
      }),
    }

    // Use proper type casting
    vi.mocked(create7TVClient).mockReturnValueOnce(
      mockClient as unknown as ReturnType<typeof create7TVClient>,
    )
    vi.mocked(isSevenTVError).mockReturnValueOnce(true)

    await handler(req, res)

    expect(res.statusCode).toBe(200)
    expect(res._getJSONData()).toEqual({ message: 'Test skipped - user lacks permissions' })
    expect(get7TVUser).toHaveBeenCalledWith('test-twitch-id')
    expect(getOrCreateEmoteSet).toHaveBeenCalled()
    expect(mockClient.request).toHaveBeenCalled()
  })

  it('successfully completes the emote set test', async () => {
    const { req, res } = createMocks({
      method: 'GET',
    })

    // Mock get7TVUser to return a user
    vi.mocked(get7TVUser).mockResolvedValueOnce({
      user: { id: 'test-user-id' },
    })

    // Mock getOrCreateEmoteSet to return an emote set
    vi.mocked(getOrCreateEmoteSet).mockResolvedValueOnce({
      emoteSetId: 'test-emote-set-id',
      created: true,
    })

    // Mock client.request for adding emote
    const mockClient = {
      request: vi.fn().mockResolvedValueOnce({}),
    }

    // Use proper type casting
    vi.mocked(create7TVClient).mockReturnValueOnce(
      mockClient as unknown as ReturnType<typeof create7TVClient>,
    )

    // Create a properly typed mock EmoteSetResponse
    const mockEmoteSetResponse: EmoteSetResponse = {
      emoteSet: {
        emote_count: 1,
        capacity: 10,
        flags: 0,
        name: 'TestEmoteSet',
        emotes: [
          {
            id: 'test-emote-id',
            name: 'TESTER',
            data: {
              id: 'test-data-id',
              name: 'TESTER',
              host: {
                url: 'https://example.com',
                files: [
                  {
                    name: 'test-file',
                    format: 'webp',
                  },
                ],
              },
            },
          },
        ],
      },
    }

    vi.mocked(verifyEmoteInSet).mockResolvedValueOnce(mockEmoteSetResponse)

    await handler(req, res)

    expect(res.statusCode).toBe(200)
    expect(res._getJSONData()).toEqual({ message: 'Emote set test completed successfully' })
    expect(get7TVUser).toHaveBeenCalledWith('test-twitch-id')
    expect(getOrCreateEmoteSet).toHaveBeenCalled()
    expect(mockClient.request).toHaveBeenCalledWith('mock-change-emote-query', {
      id: 'test-emote-set-id',
      action: 'ADD',
      name: 'TESTER',
      emote_id: '60ae4ec30e35477634988c18',
    })
    expect(verifyEmoteInSet).toHaveBeenCalledWith(mockClient, 'test-emote-set-id', 'TESTER')
  })

  it('handles errors during the emote set test', async () => {
    const { req, res } = createMocks({
      method: 'GET',
    })

    // Mock get7TVUser to throw an error
    vi.mocked(get7TVUser).mockRejectedValueOnce(new Error('Test error'))

    await handler(req, res)

    expect(res.statusCode).toBe(500)
    expect(res._getJSONData()).toEqual({
      message: 'Internal server error',
      error: 'Test error',
    })
    expect(captureException).toHaveBeenCalled()
    expect(withScope).toHaveBeenCalled()
  })
})
