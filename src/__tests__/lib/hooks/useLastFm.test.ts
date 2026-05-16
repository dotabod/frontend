import { describe, expect, it } from 'vitest'
import { parseLastFmResponse } from '@/lib/hooks/useLastFm'

describe('parseLastFmResponse', () => {
  it('reads Last.fm now playing state from the @attr field', () => {
    expect(
      parseLastFmResponse({
        recenttracks: {
          track: [
            {
              '@attr': { nowplaying: 'true' },
              artist: { '#text': 'Artist' },
              name: 'Song',
              album: { '#text': 'Album' },
              image: [{ size: 'medium', '#text': 'https://example.com/cover.jpg' }],
              url: 'https://example.com/song',
            },
          ],
        },
      }),
    ).toEqual({
      artist: 'Artist',
      title: 'Song',
      album: 'Album',
      albumArt: 'https://example.com/cover.jpg',
      url: 'https://example.com/song',
    })
  })
})
