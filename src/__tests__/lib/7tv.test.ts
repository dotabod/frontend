import { afterEach, describe, expect, it, vi } from 'vitest'

import { create7TVClient } from '@/lib/7tv'

describe('create7TVClient', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('throws without a token', () => {
    expect(() => create7TVClient()).toThrow('No 7TV auth token provided')
  })

  // 7TV answers cookie auth from server origins with a 403, so the token must use the
  // Authorization header.
  it('sends the token as a bearer Authorization header', async () => {
    const fetchMock = vi.fn<typeof fetch>(
      async () =>
        new Response(JSON.stringify({ data: { ok: true } }), {
          headers: { 'content-type': 'application/json' },
        }),
    )
    vi.stubGlobal('fetch', fetchMock)

    await create7TVClient('test-token').request('query { ok }')

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0]
    expect(String(url)).toBe('https://7tv.io/v3/gql')
    const headers = new Headers(init?.headers)
    expect(headers.get('authorization')).toBe('Bearer test-token')
    expect(headers.has('cookie')).toBe(false)
  })
})
