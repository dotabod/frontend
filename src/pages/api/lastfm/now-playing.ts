import type { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from '@/lib/api/getServerSession'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/db'
import { Settings } from '@/lib/defaultSettings'
import { withAuthentication } from '@/lib/api-middlewares/with-authentication'

type LastFmResponse = {
  artist: string
  title: string
  album: string
  albumArt: string | null
  url: string
} | null

async function handler(
  req: NextApiRequest,
  res: NextApiResponse<LastFmResponse | { error: string }>,
) {
  try {
    const session = await getServerSession(req, res, authOptions)
    const userId = (req.query.id as string) || session?.user?.id || (req.query.token as string)

    if (!userId) {
      return res.status(400).json({ error: 'Username is required' })
    }

    // Get API key from environment variable
    const apiKey = process.env.LASTFM_API_KEY
    if (!apiKey) {
      return res.status(500).json({ error: 'Last.fm API key is not configured' })
    }

    const lastfmUsername = await prisma.setting.findUnique({
      where: {
        key_userId: {
          key: Settings.lastFmUsername,
          userId,
        },
      },
      select: {
        value: true,
      },
    })

    if (!lastfmUsername) {
      return res.status(400).json({ error: 'Last.fm username is not configured' })
    }

    const url = `https://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks&user=${lastfmUsername.value}&api_key=${apiKey}&format=json&limit=1`

    const response = await fetch(url)
    const data = await response.json()

    if (data.error) {
      return res.status(400).json({ error: data.message || 'Error fetching Last.fm data' })
    }

    const tracks = data.recenttracks?.track
    if (!tracks || !tracks.length) {
      return res.status(200).json({
        error: 'No tracks found',
      })
    }

    const recentTrack = tracks[0]
    const isNowPlaying = recentTrack['@attr']?.nowplaying === 'true'

    if (isNowPlaying) {
      const albumArtUrl =
        recentTrack.image.find((img) => img.size === 'medium')?.['#text'] ||
        recentTrack.image[0]?.['#text'] ||
        null

      // Check if the album art URL contains the Last.fm placeholder image
      const albumArt = albumArtUrl?.includes('2a96cbd8b46e442fc41c2b86b821562f')
        ? null
        : albumArtUrl

      return res.status(200).json({
        artist: recentTrack.artist['#text'],
        title: recentTrack.name,
        album: recentTrack.album['#text'],
        albumArt,
        url: recentTrack.url,
      })
    }

    // Not currently playing anything
    return res.status(200).json({
      error: 'Not currently playing anything',
    })
  } catch (error) {
    console.error('Error in Last.fm API:', error)
    return res.status(500).json({ error: 'Failed to fetch Last.fm data' })
  }
}

export default withAuthentication(handler)
