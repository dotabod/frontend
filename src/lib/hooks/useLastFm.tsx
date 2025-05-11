import { Settings } from '@/lib/defaultSettings'
import { useUpdateSetting } from '@/lib/hooks/useUpdateSetting'
import { useRouter } from 'next/router'
import { useEffect, useRef, useState } from 'react'

type LastFmTrackType = {
  artist: string
  title: string
  album?: string
  albumArt?: string
  url?: string
}
export function useLastFm() {
  const [track, setTrack] = useState<LastFmTrackType | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const { userId } = router.query
  const prevTrackRef = useRef<LastFmTrackType | null>(null)

  const { data: isEnabled } = useUpdateSetting(Settings.lastFmOverlay)
  const { data: username } = useUpdateSetting(Settings.lastFmUsername)
  const { data: refreshRate } = useUpdateSetting(Settings.lastFmRefreshRate)

  useEffect(() => {
    if (!isEnabled || !username) return

    const fetchNowPlaying = async () => {
      try {
        setLoading(true)
        setError(null)

        const response = await fetch(`/api/lastfm/now-playing?id=${userId ?? ''}`)

        if (!response.ok) {
          const errorData = await response.json()
          setError(errorData.error || 'Error fetching Last.fm data')
          setTrack(null)
          return
        }

        const trackData = await response.json()
        if (trackData?.error) {
          setError(trackData.error)
          setTrack(null)
          return
        }

        // Compare with previous track to avoid unnecessary rerenders
        const prevTrack = prevTrackRef.current
        if (
          !prevTrack ||
          prevTrack.artist !== trackData.artist ||
          prevTrack.title !== trackData.title ||
          prevTrack.album !== trackData.album ||
          prevTrack.albumArt !== trackData.albumArt ||
          prevTrack.url !== trackData.url
        ) {
          prevTrackRef.current = trackData
          setTrack(trackData)
        }
      } catch (err) {
        console.error('Error fetching Last.fm data:', err)
        setError('Failed to fetch Last.fm data')
        setTrack(null)
      } finally {
        setLoading(false)
      }
    }

    // Initial fetch
    fetchNowPlaying()

    // Set up interval to fetch periodically
    const intervalSeconds = typeof refreshRate === 'number' ? refreshRate : 30
    const intervalId = setInterval(fetchNowPlaying, intervalSeconds * 1000)

    return () => {
      clearInterval(intervalId)
    }
  }, [isEnabled, username, refreshRate, userId])

  return { track, loading, error }
}
