import { useCallback, useEffect, useRef, useState } from 'react'
import { Settings } from '@/lib/defaultSettings'
import { useUpdateSetting } from '@/lib/hooks/useUpdateSetting'

interface LastFmTrackType {
  artist: string
  title: string
  album?: string
  albumArt?: string | null
  url?: string
}

const LASTFM_API_KEY = process.env.NEXT_PUBLIC_LASTFM_API_KEY
const LASTFM_PLACEHOLDER_HASH = '2a96cbd8b46e442fc41c2b86b821562f'

interface LastFmImage {
  size: string
  '#text': string
}

// Last.fm's JSON API returns track/artist/album names with HTML-encoded
// Entities (e.g. "&#39;" for "'"). JSX renders strings as textContent, so
// Without decoding the overlay would show the literal "Everybody&#39;s".
const decodeHtmlEntities = (s: string): string =>
  s
    .replaceAll(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
    .replaceAll(/&#x([0-9a-fA-F]+);/g, (_, hex: string) =>
      String.fromCodePoint(Number.parseInt(hex, 16)),
    )
    .replaceAll('&quot;', '"')
    .replaceAll('&apos;', "'")
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&amp;', '&')

interface LastFmResponse {
  error?: number
  recenttracks?: {
    track: {
      '@attr'?: { nowplaying: string }
      artist: { '#text': string }
      name: string
      album: { '#text': string }
      image?: LastFmImage[]
      url?: string
    }[]
  }
}

export function parseLastFmResponse(data: LastFmResponse): LastFmTrackType | null {
  if (data?.error) {
    return null
  }

  const tracks = data?.recenttracks?.track
  if (!tracks?.length) {
    return null
  }

  const recentTrack = tracks[0]
  const isNowPlaying = recentTrack['@attr']?.nowplaying === 'true'
  if (!isNowPlaying) {
    return null
  }

  const albumArtUrl =
    recentTrack.image?.find((img: LastFmImage) => img.size === 'medium')?.['#text'] ||
    recentTrack.image?.[0]?.['#text'] ||
    null

  const albumArt = albumArtUrl?.includes(LASTFM_PLACEHOLDER_HASH) ? null : albumArtUrl

  return {
    album: decodeHtmlEntities(recentTrack.album['#text']),
    albumArt,
    artist: decodeHtmlEntities(recentTrack.artist['#text']),
    title: decodeHtmlEntities(recentTrack.name),
    url: recentTrack.url,
  }
}

export function useLastFm() {
  const [track, setTrack] = useState<LastFmTrackType | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const prevTrackRef = useRef<LastFmTrackType | null>(null)

  const { data: isEnabled } = useUpdateSetting(Settings.lastFmOverlay)
  const { data: username } = useUpdateSetting<string>(Settings.lastFmUsername)
  const { data: refreshRate } = useUpdateSetting(Settings.lastFmRefreshRate)

  const fetchNowPlaying = useCallback(async () => {
    if (!username || !LASTFM_API_KEY) {
      return
    }

    try {
      setLoading(true)
      setError(null)

      // Call Last.fm via the Next.js rewrite proxy — no serverless function invocation
      const url = `/lastfm-proxy/2.0/?method=user.getrecenttracks&user=${encodeURIComponent(username)}&api_key=${LASTFM_API_KEY}&format=json&limit=1`
      const response = await fetch(url)

      if (!response.ok) {
        setError('Error fetching Last.fm data')
        setTrack(null)
        return
      }

      const data = await response.json()
      const parsed = parseLastFmResponse(data)

      if (!parsed) {
        setError(data?.message || 'Not currently playing anything')
        setTrack(null)
        return
      }

      // Compare with previous track to avoid unnecessary rerenders
      const prev = prevTrackRef.current
      if (
        !prev ||
        prev.artist !== parsed.artist ||
        prev.title !== parsed.title ||
        prev.album !== parsed.album ||
        prev.albumArt !== parsed.albumArt ||
        prev.url !== parsed.url
      ) {
        prevTrackRef.current = parsed
        setTrack(parsed)
      }
    } catch (error) {
      console.error('Error fetching Last.fm data:', error)
      setError('Failed to fetch Last.fm data')
      setTrack(null)
    } finally {
      setLoading(false)
    }
  }, [username])

  useEffect(() => {
    if (!isEnabled || !username) {
      return
    }

    // Initial fetch
    void fetchNowPlaying()

    // Set up interval to fetch periodically
    const configuredInterval = typeof refreshRate === 'number' ? refreshRate : 30
    const intervalSeconds = Math.max(30, configuredInterval)
    const intervalId = setInterval(fetchNowPlaying, intervalSeconds * 1000)

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void fetchNowPlaying()
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      clearInterval(intervalId)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [isEnabled, username, refreshRate, fetchNowPlaying])

  return { error, loading, track }
}
