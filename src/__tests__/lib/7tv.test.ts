import { afterEach, describe, expect, it, vi } from 'vitest'

import type { UserByTwitchIdResponse } from '@/lib/7tv'
import { create7TVClient, get7TVUser } from '@/lib/7tv'

describe(create7TVClient, () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('throws without a token', () => {
    expect(() => create7TVClient()).toThrow('No 7TV auth token provided')
  })

  // 7TV answers cookie auth from server origins with a 403, so the token must use the
  // Authorization header.
  it('sends the token as a bearer Authorization header', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(Response.json({ data: { ok: true } }))
    vi.stubGlobal('fetch', fetchMock)

    await create7TVClient('test-token').request('query { ok }')

    expect(fetchMock).toHaveBeenCalledOnce()
    const [[url, init]] = fetchMock.mock.calls
    expect(url).toHaveProperty('href', 'https://7tv.io/v3/gql')
    const headers = new Headers(init?.headers)
    expect(headers.get('authorization')).toBe('Bearer test-token')
    expect(headers.has('cookie')).toBeFalsy()
  })
})

const answerWith = (userByConnection: UserByTwitchIdResponse['userByConnection']) => {
  const fetchMock = vi
    .fn<typeof fetch>()
    .mockResolvedValue(Response.json({ data: { userByConnection } }))
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

describe(get7TVUser, () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('returns the user and the emote set of their Twitch connection', async () => {
    const fetchMock = answerWith({
      connections: [
        { emote_set_id: 'discord-set', id: 'discord-1', platform: 'DISCORD' },
        { emote_set_id: 'twitch-set', id: 'twitch-1', platform: 'TWITCH' },
      ],
      id: 'stv-user',
    })

    await expect(get7TVUser('twitch-1')).resolves.toStrictEqual({
      emote_set: { id: 'twitch-set' },
      user: { id: 'stv-user' },
    })
    const [[url, init]] = fetchMock.mock.calls
    expect(url).toHaveProperty('href', 'https://7tv.io/v3/gql')
    await expect(new Request(url, init).json()).resolves.toHaveProperty('variables', {
      id: 'twitch-1',
    })
  })

  it('throws for a Twitch ID 7TV does not know', async () => {
    answerWith({ connections: [], id: '00000000000000000000000000' })

    await expect(get7TVUser('twitch-1')).rejects.toThrow('7tv user not found')
  })
})
