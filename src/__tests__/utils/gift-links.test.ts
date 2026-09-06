import { describe, expect, it } from 'vitest'

import { createGiftLink } from '@/utils/gift-links'

describe('gift subscription route creation', () => {
  it('creates a relative profile route for a valid Twitch login name', () => {
    expect(createGiftLink('  Streamer_42  ')).toBe('/streamer_42/gift')
  })

  it('allows a short legacy Twitch login name', () => {
    expect(createGiftLink('a')).toBe('/a/gift')
  })

  it('uses the generic gift page when the supplied username could escape the profile route', () => {
    expect(createGiftLink('//evil.example')).toBe('/gift')
  })
})
