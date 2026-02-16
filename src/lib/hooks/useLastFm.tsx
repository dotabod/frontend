import { useRouter } from 'next/router'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Settings } from '@/lib/defaultSettings'
import { useUpdateSetting } from '@/lib/hooks/useUpdateSetting'

type LastFmTrackType = {
  artist: string
  title: string
  album?: string
  albumArt?: string
  url?: string
}

const LASTFM_API_KEY = process.env.NEXT_PUBLIC_LASTFM_API_KEY
const LASTFM_PLACEHOLDER_HASH = '2a96cbd8b46e442fc41c2b86b821562f'

function parseLastFmResponse(data: any): LastFmTrackType | null {
  if (data?.error) return null

  const tracks = data?.recenttracks?.track
  if (!tracks?.length) return null

  const recentTrack = tracks[0]
  const isNowPlaying = recentTrack['@attr']?.nowplaying === 'true'
  if (!isNowPlaying) return null

  const albumArtUrl =
    recentTrack.image?.find((img: any) => img.size === 'medium')?.['#text'] ||
    recentTrack.image?.[0]?.['#text'] ||
    null

  const albumArt = albumArtUrl?.includes(LASTFM_PLACEHOLDER_HASH) ? null : albumArtUrl

  return {
    artist: recentTrack.artist['#text'],
    title: recentTrack.name,
    album: recentTrack.album['#text'],
    albumArt,
    url: recentTrack.url,
  }
}

export function useLastFm() {
  const [track, setTrack] = useState<LastFmTrackType | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const { userId } = router.query
  const prevTrackRef = useRef<LastFmTrackType | null>(null)

  const { data: isEnabled } = useUpdateSetting(Settings.lastFmOverlay)
  const { data: username } = useUpdateSetting<string>(Settings.lastFmUsername)
  const { data: refreshRate } = useUpdateSetting(Settings.lastFmRefreshRate)

  const fetchNowPlaying = useCallback(async () => {
    if (!username || !LASTFM_API_KEY) return

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
    } catch (err) {
      console.error('Error fetching Last.fm data:', err)
      setError('Failed to fetch Last.fm data')
      setTrack(null)
    } finally {
      setLoading(false)
    }
  }, [username])

  useEffect(() => {
    if (!isEnabled || !username) return

    // Initial fetch
    fetchNowPlaying()

    // Set up interval to fetch periodically
    const configuredInterval = typeof refreshRate === 'number' ? refreshRate : 30
    const intervalSeconds = Math.max(30, configuredInterval)
    const intervalId = setInterval(fetchNowPlaying, intervalSeconds * 1000)

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchNowPlaying()
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      clearInterval(intervalId)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [isEnabled, username, refreshRate, userId, fetchNowPlaying])

  return { track, loading, error }
}
