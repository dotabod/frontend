// @ts-nocheck
import { captureException, withScope } from '@sentry/nextjs'
import { createMocks } from 'node-mocks-http'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { create7TVClient, get7TVUser } from '@/lib/7tv'
import { CHANGE_EMOTE_IN_SET, GET_EMOTE_SET_EMOTE_NAMES } from '@/lib/gql'
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

vi.mock('@sentry/nextjs', () => ({
  captureException: vi.fn(),
  withScope: vi.fn((callback) => callback({ setContext: vi.fn(), setTag: vi.fn() })),
}))

const TEST_EMOTE_NAME = 'DOTABOD_TEST'
const TEST_EMOTE_ID = '60ae4ec30e35477634988c18'

type RequestMock = (document: string, variables?: Record<string, string>) => Promise<object>

const mockEmoteSet = function mockEmoteSet(emotes: { name: string }[] = []) {
  return { emoteSet: { emotes } }
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
    expect(res._getJSONData()).toStrictEqual({ success: false })
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
    expect(res._getJSONData()).toStrictEqual({ success: false })
  })

  it('returns 405 for non-GET methods', async () => {
    const { req, res } = createMocks({
      method: 'POST',
    })

    await handler(req, res)

    expect(res.statusCode).toBe(405)
    expect(res._getJSONData()).toStrictEqual({ message: 'Method not allowed' })
  })

  it('returns 403 when CRON_TWITCH_ID is missing', async () => {
    vi.stubEnv('CRON_TWITCH_ID')

    const { req, res } = createMocks({
      method: 'GET',
    })

    await handler(req, res)

    expect(res.statusCode).toBe(403)
    expect(res._getJSONData()).toStrictEqual({ message: 'Forbidden' })
  })

  it('returns 500 when SEVENTV_AUTH is missing', async () => {
    vi.stubEnv('SEVENTV_AUTH')

    const { req, res } = createMocks({
      method: 'GET',
    })

    await handler(req, res)

    expect(res.statusCode).toBe(500)
    expect(res._getJSONData()).toStrictEqual({ message: 'Server configuration error' })
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
    expect(res._getJSONData()).toStrictEqual({
      error: 'No active 7TV emote set found',
      message: 'Internal server error',
    })
    expect(mockClient.request).not.toHaveBeenCalled()
  })

  it('adds, verifies, and removes a test emote in the active set without creating sets', async () => {
    const mockClient = {
      request: vi
        .fn<RequestMock>()
        .mockResolvedValueOnce({})
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
    expect(res._getJSONData()).toStrictEqual({ message: 'Emote set test completed successfully' })
    expect(get7TVUser).toHaveBeenCalledWith('test-twitch-id')
    expect(create7TVClient).toHaveBeenCalledWith('test-auth-token')
    // 7TV can take 20 seconds to send an emote set, so the set is read only to verify the add.
    const testEmote = { emote_id: TEST_EMOTE_ID, id: 'active-emote-set-id', name: TEST_EMOTE_NAME }
    expect(mockClient.request.mock.calls).toStrictEqual([
      [CHANGE_EMOTE_IN_SET, { action: 'ADD', ...testEmote }],
      [GET_EMOTE_SET_EMOTE_NAMES, { id: 'active-emote-set-id' }],
      [CHANGE_EMOTE_IN_SET, { action: 'REMOVE', ...testEmote }],
    ])
  })

  it('removes a test emote left by an earlier run when the add fails', async () => {
    const mockClient = {
      request: vi
        .fn<RequestMock>()
        .mockRejectedValueOnce(new Error('Emote already enabled'))
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
    expect(mockClient.request.mock.calls.map(([, variables]) => variables?.action)).toStrictEqual([
      'ADD',
      'REMOVE',
    ])
  })

  it('attempts cleanup when verification fails after adding the test emote', async () => {
    const mockClient = {
      request: vi
        .fn<RequestMock>()
        .mockResolvedValueOnce({})
        .mockRejectedValueOnce(new Error('Verification failed'))
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
    expect(res._getJSONData()).toStrictEqual({
      error: 'Verification failed',
      message: 'Internal server error',
    })
    expect(mockClient.request).toHaveBeenLastCalledWith(CHANGE_EMOTE_IN_SET, {
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
    expect(res._getJSONData()).toStrictEqual({
      error: 'Test error',
      message: 'Internal server error',
    })
    expect(captureException).toHaveBeenCalledOnce()
    expect(withScope).toHaveBeenCalledOnce()
  })
})
