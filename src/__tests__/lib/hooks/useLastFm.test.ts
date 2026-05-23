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

  // Last.fm sends HTML-encoded entities in track names (e.g. "&#39;" for "'",
  // "&amp;" for "&"). JSX renders text as textContent, so without decoding the
  // overlay would show the literal "Everybody&#39;s Celebratin&#39;".
  it('decodes HTML entities in artist/title/album', () => {
    expect(
      parseLastFmResponse({
        recenttracks: {
          track: [
            {
              '@attr': { nowplaying: 'true' },
              artist: { '#text': 'Dr. Dre &amp; Friends' },
              name: 'Fuck Wit Dre Day (And Everybody&#39;s Celebratin&#39;)',
              album: { '#text': 'The Chronic &quot;Remastered&quot;' },
              image: [],
              url: 'https://example.com/song',
            },
          ],
        },
      }),
    ).toEqual({
      artist: 'Dr. Dre & Friends',
      title: "Fuck Wit Dre Day (And Everybody's Celebratin')",
      album: 'The Chronic "Remastered"',
      albumArt: null,
      url: 'https://example.com/song',
    })
  })
})
