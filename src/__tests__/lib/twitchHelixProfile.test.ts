import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { twitchHelixProfile } from '@/lib/twitchHelixProfile'

const originalFetch = globalThis.fetch
const originalClientId = process.env.TWITCH_CLIENT_ID

beforeEach(() => {
  process.env.TWITCH_CLIENT_ID = 'test-client-id'
})

afterEach(() => {
  globalThis.fetch = originalFetch
  process.env.TWITCH_CLIENT_ID = originalClientId
})

const oidcProfile = {
  email: 'info@example.com',
  picture: 'https://example.com/pic.png',
  preferred_username: 'TECHLEED',
  sub: '32474777',
}

function mockFetchOnce(response: { ok?: boolean; status?: number; json?: () => Promise<unknown> }) {
  globalThis.fetch = vi.fn(async () => ({
    json: response.json ?? (async () => ({})),
    ok: response.ok ?? true,
    status: response.status ?? 200,
  })) as unknown as typeof fetch
}

describe(twitchHelixProfile, () => {
  it('returns the helix login as `name` and helix display_name as `displayName`', async () => {
    mockFetchOnce({
      json: async () => ({
        data: [
          {
            display_name: 'TECHLEED',
            id: '32474777',
            login: 'techleed',
          },
        ],
      }),
    })

    const user = await twitchHelixProfile(oidcProfile, 'access-token-123')

    expect(user).toStrictEqual({
      displayName: 'TECHLEED',
      email: 'info@example.com',
      id: '32474777',
      image: 'https://example.com/pic.png',
      name: 'techleed',
    })

    // Sanity-check that the correct Twitch endpoint was hit with the right headers.
    const fetchMock = globalThis.fetch as ReturnType<typeof vi.fn>
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('https://api.twitch.tv/helix/users')
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer access-token-123')
    expect((init.headers as Record<string, string>)['Client-Id']).toBe('test-client-id')
  })

  it('falls back to preferred_username (lowercased) for name when Helix returns no data', async () => {
    // Defensive fallback: if /helix/users misbehaves (rate limit, malformed
    // response, scope issue), we still create a row rather than crashing the
    // signin flow. The backend handleNewUser will fix `name`/`displayName` on
    // the first INSERT:accounts event.
    mockFetchOnce({ json: async () => ({ data: [] }) })

    const user = await twitchHelixProfile(oidcProfile, 'tok')

    expect(user.id).toBe('32474777')
    expect(user.name).toBe('techleed')
    expect(user.displayName).toBe('TECHLEED')
  })

  it('falls back when Helix returns a non-2xx response', async () => {
    mockFetchOnce({ ok: false, status: 503 })

    const user = await twitchHelixProfile(oidcProfile, 'tok')

    expect(user.name).toBe('techleed')
    expect(user.displayName).toBe('TECHLEED')
  })

  it('falls back when the fetch itself throws (network blip)', async () => {
    globalThis.fetch = vi.fn(async () => {
      throw new Error('ECONNRESET')
    })

    const user = await twitchHelixProfile(oidcProfile, 'tok')

    expect(user.name).toBe('techleed')
    expect(user.displayName).toBe('TECHLEED')
  })

  it('preserves Unicode display names (e.g. Japanese kanji) and uses the ASCII login for `name`', async () => {
    mockFetchOnce({
      json: async () => ({
        data: [
          {
            display_name: 'カンジ',
            id: '999',
            login: 'kanjistreamer',
          },
        ],
      }),
    })

    const user = await twitchHelixProfile({ preferred_username: 'カンジ', sub: '999' }, 'tok')

    expect(user.name).toBe('kanjistreamer')
    expect(user.displayName).toBe('カンジ')
  })
})
