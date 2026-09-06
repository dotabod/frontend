import { describe, expect, it } from 'vitest'

import { parseTwitchProfile } from '@/types/twitch'

describe('parseTwitchProfile', () => {
  it('keeps the supported Twitch OIDC claims', () => {
    expect(
      parseTwitchProfile({
        email: 'streamer@example.com',
        nonce: 'unrelated-provider-claim',
        picture: 'https://cdn.example.com/avatar.png',
        preferred_username: 'Streamer',
        sub: '1234',
      }),
    ).toStrictEqual({
      email: 'streamer@example.com',
      picture: 'https://cdn.example.com/avatar.png',
      preferred_username: 'Streamer',
      sub: '1234',
    })
  })

  it('rejects malformed Twitch claims instead of treating them as strings', () => {
    expect(parseTwitchProfile({ preferred_username: 1234 })).toBeUndefined()
  })
})
