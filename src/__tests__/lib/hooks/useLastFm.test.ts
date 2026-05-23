import { describe, expect, it } from 'vite-plus/test'
import { parseLastFmResponse } from '@/lib/hooks/useLastFm'

describe('parseLastFmResponse', () => {
  it('reads Last.fm now playing state from the @attr field', () => {
    expect(
      parseLastFmResponse({
        recenttracks: {
          track: [
            {
              '@attr': { nowplaying: 'true' },
              album: { '#text': 'Album' },
              artist: { '#text': 'Artist' },
              image: [{ '#text': 'https://example.com/cover.jpg', size: 'medium' }],
              name: 'Song',
              url: 'https://example.com/song',
            },
          ],
        },
      }),
    ).toEqual({
      album: 'Album',
      albumArt: 'https://example.com/cover.jpg',
      artist: 'Artist',
      title: 'Song',
      url: 'https://example.com/song',
    })
  })

  // Last.fm sends HTML-encoded entities in track names (e.g. "&#39;" for "'",
  // "&amp;" for "&"). JSX renders text as textContent, so without decoding the
  // Overlay would show the literal "Everybody&#39;s Celebratin&#39;".
  it('decodes HTML entities in artist/title/album', () => {
    expect(
      parseLastFmResponse({
        recenttracks: {
          track: [
            {
              '@attr': { nowplaying: 'true' },
              album: { '#text': 'The Chronic &quot;Remastered&quot;' },
              artist: { '#text': 'Dr. Dre &amp; Friends' },
              image: [],
              name: 'Fuck Wit Dre Day (And Everybody&#39;s Celebratin&#39;)',
              url: 'https://example.com/song',
            },
          ],
        },
      }),
    ).toEqual({
      album: 'The Chronic "Remastered"',
      albumArt: null,
      artist: 'Dr. Dre & Friends',
      title: "Fuck Wit Dre Day (And Everybody's Celebratin')",
      url: 'https://example.com/song',
    })
  })
})
