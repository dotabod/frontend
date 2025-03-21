import { Settings } from '@/lib/defaultSettings'
import { useUpdateSetting } from '@/lib/hooks/useUpdateSetting'
import { useEffect, useState } from 'react'

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

  const { data: isEnabled } = useUpdateSetting(Settings.lastFmOverlay)
  const { data: username } = useUpdateSetting(Settings.lastFmUsername)
  const { data: refreshRate } = useUpdateSetting(Settings.lastFmRefreshRate)

  useEffect(() => {
    if (!isEnabled || !username) return

    const fetchNowPlaying = async () => {
      try {
        setLoading(true)
        setError(null)

        const response = await fetch('/api/lastfm/now-playing')

        if (!response.ok) {
          const errorData = await response.json()
          setError(errorData.error || 'Error fetching Last.fm data')
          setTrack(null)
          return
        }

        const trackData = await response.json()
        setTrack(trackData)
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
  }, [isEnabled, username, refreshRate])

  return { track, loading, error }
}
