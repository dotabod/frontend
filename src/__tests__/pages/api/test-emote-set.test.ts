// @ts-nocheck
import { captureException, withScope } from '@sentry/nextjs'
import { createMocks } from 'node-mocks-http'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test'
import { create7TVClient, get7TVUser } from '@/lib/7tv'
import handler from '@/pages/api/test-emote-set'

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
  create7TVClient: vi.fn(),
  get7TVUser: vi.fn(),
}))

vi.mock('@/lib/gql', () => ({
  CHANGE_EMOTE_IN_SET: 'mock-change-emote-query',
  GET_EMOTE_SET_FOR_CARD: 'mock-get-emote-set-query',
}))

vi.mock('@sentry/nextjs', () => ({
  captureException: vi.fn(),
  withScope: vi.fn((callback) => callback({ setContext: vi.fn(), setTag: vi.fn() })),
}))

const TEST_EMOTE_NAME = 'DOTABOD_TEST'
const TEST_EMOTE_ID = '60ae4ec30e35477634988c18'

function mockEmoteSet(emotes: { name: string }[] = []) {
  return {
    emoteSet: {
      capacity: 100,
      emote_count: emotes.length,
      emotes: emotes.map((emote) => ({
        data: {
          host: {
            files: [{ format: 'WEBP', name: '1x.webp' }],
            url: 'https://example.com',
          },
          id: TEST_EMOTE_ID,
          name: emote.name,
        },
        id: 'test-emote-id',
        name: emote.name,
      })),
      flags: 0,
      name: 'ActiveEmoteSet',
    },
  }
}

describe('test-emote-set API', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.stubEnv('NODE_ENV', 'development')
    vi.stubEnv('CRON_SECRET', 'test-secret')
    vi.stubEnv('CRON_TWITCH_ID', 'test-twitch-id')
    vi.stubEnv('SEVENTV_AUTH', 'test-auth-token')
  })

  afterEach(() => {
    vi.clearAllMocks()
    vi.unstubAllEnvs()
  })

  it('returns 401 when authorization header is missing in production', async () => {
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
      headers: {
        authorization: 'Bearer invalid-secret',
      },
      method: 'GET',
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
    vi.stubEnv('CRON_TWITCH_ID')

    const { req, res } = createMocks({
      method: 'GET',
    })

    await handler(req, res)

    expect(res.statusCode).toBe(403)
    expect(res._getJSONData()).toEqual({ message: 'Forbidden' })
  })

  it('returns 500 when SEVENTV_AUTH is missing', async () => {
    vi.stubEnv('SEVENTV_AUTH')

    const { req, res } = createMocks({
      method: 'GET',
    })

    await handler(req, res)

    expect(res.statusCode).toBe(500)
    expect(res._getJSONData()).toEqual({ message: 'Server configuration error' })
  })

  it('returns 500 when the user has no active emote set', async () => {
    const mockClient = { request: vi.fn() }
    vi.mocked(create7TVClient).mockReturnValueOnce(
      mockClient as unknown as ReturnType<typeof create7TVClient>,
    )
    vi.mocked(get7TVUser).mockResolvedValueOnce({
      user: { id: 'test-user-id' },
    })

    const { req, res } = createMocks({
      method: 'GET',
    })

    await handler(req, res)

    expect(res.statusCode).toBe(500)
    expect(res._getJSONData()).toEqual({
      error: 'No active 7TV emote set found',
      message: 'Internal server error',
    })
    expect(mockClient.request).not.toHaveBeenCalled()
  })

  it('adds, verifies, and removes a test emote in the active set without creating sets', async () => {
    const mockClient = {
      request: vi
        .fn()
        .mockResolvedValueOnce(mockEmoteSet())
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce(mockEmoteSet([{ name: TEST_EMOTE_NAME }]))
        .mockResolvedValueOnce(mockEmoteSet([{ name: TEST_EMOTE_NAME }]))
        .mockResolvedValueOnce({}),
    }
    vi.mocked(create7TVClient).mockReturnValueOnce(
      mockClient as unknown as ReturnType<typeof create7TVClient>,
    )
    vi.mocked(get7TVUser).mockResolvedValueOnce({
      emote_set: { id: 'active-emote-set-id' },
      user: { id: 'test-user-id' },
    })

    const { req, res } = createMocks({
      method: 'GET',
    })

    await handler(req, res)

    expect(res.statusCode).toBe(200)
    expect(res._getJSONData()).toEqual({ message: 'Emote set test completed successfully' })
    expect(get7TVUser).toHaveBeenCalledWith('test-twitch-id')
    expect(create7TVClient).toHaveBeenCalledWith('test-auth-token')
    expect(mockClient.request).toHaveBeenCalledWith('mock-change-emote-query', {
      action: 'ADD',
      emote_id: TEST_EMOTE_ID,
      id: 'active-emote-set-id',
      name: TEST_EMOTE_NAME,
    })
    expect(mockClient.request).toHaveBeenCalledWith('mock-change-emote-query', {
      action: 'REMOVE',
      emote_id: TEST_EMOTE_ID,
      id: 'active-emote-set-id',
      name: TEST_EMOTE_NAME,
    })
  })

  it('cleans up a stale test emote before retrying the write test', async () => {
    const mockClient = {
      request: vi
        .fn()
        .mockResolvedValueOnce(mockEmoteSet([{ name: TEST_EMOTE_NAME }]))
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce(mockEmoteSet([{ name: TEST_EMOTE_NAME }]))
        .mockResolvedValueOnce(mockEmoteSet([{ name: TEST_EMOTE_NAME }]))
        .mockResolvedValueOnce({}),
    }
    vi.mocked(create7TVClient).mockReturnValueOnce(
      mockClient as unknown as ReturnType<typeof create7TVClient>,
    )
    vi.mocked(get7TVUser).mockResolvedValueOnce({
      emote_set: { id: 'active-emote-set-id' },
      user: { id: 'test-user-id' },
    })

    const { req, res } = createMocks({
      method: 'GET',
    })

    await handler(req, res)

    expect(res.statusCode).toBe(200)
    const mutationCalls = mockClient.request.mock.calls.filter(
      ([query]) => query === 'mock-change-emote-query',
    )
    expect(mutationCalls.map(([, variables]) => variables.action)).toEqual([
      'REMOVE',
      'ADD',
      'REMOVE',
    ])
  })

  it('attempts cleanup when verification fails after adding the test emote', async () => {
    const mockClient = {
      request: vi
        .fn()
        .mockResolvedValueOnce(mockEmoteSet())
        .mockResolvedValueOnce({})
        .mockRejectedValueOnce(new Error('Verification failed'))
        .mockResolvedValueOnce(mockEmoteSet([{ name: TEST_EMOTE_NAME }]))
        .mockResolvedValueOnce({}),
    }
    vi.mocked(create7TVClient).mockReturnValueOnce(
      mockClient as unknown as ReturnType<typeof create7TVClient>,
    )
    vi.mocked(get7TVUser).mockResolvedValueOnce({
      emote_set: { id: 'active-emote-set-id' },
      user: { id: 'test-user-id' },
    })

    const { req, res } = createMocks({
      method: 'GET',
    })

    await handler(req, res)

    expect(res.statusCode).toBe(500)
    expect(res._getJSONData()).toEqual({
      error: 'Verification failed',
      message: 'Internal server error',
    })
    expect(mockClient.request).toHaveBeenLastCalledWith('mock-change-emote-query', {
      action: 'REMOVE',
      emote_id: TEST_EMOTE_ID,
      id: 'active-emote-set-id',
      name: TEST_EMOTE_NAME,
    })
  })

  it('handles errors during the emote set test', async () => {
    const mockClient = { request: vi.fn() }
    vi.mocked(create7TVClient).mockReturnValueOnce(
      mockClient as unknown as ReturnType<typeof create7TVClient>,
    )
    vi.mocked(get7TVUser).mockRejectedValueOnce(new Error('Test error'))

    const { req, res } = createMocks({
      method: 'GET',
    })

    await handler(req, res)

    expect(res.statusCode).toBe(500)
    expect(res._getJSONData()).toEqual({
      error: 'Test error',
      message: 'Internal server error',
    })
    expect(captureException).toHaveBeenCalled()
    expect(withScope).toHaveBeenCalled()
  })
})
