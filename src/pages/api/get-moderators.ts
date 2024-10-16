import { withAuthentication } from '@/lib/api-middlewares/with-authentication'
import { withMethods } from '@/lib/api-middlewares/with-methods'
import { getServerSession } from '@/lib/api/getServerSession'
import { authOptions } from '@/lib/auth'
import { getTwitchTokens } from '@/lib/getTwitchTokens'
import { captureException } from '@sentry/nextjs'
import type { NextApiRequest, NextApiResponse } from 'next'
import fetch from 'node-fetch'

const TWITCH_MODERATED_CHANNELS_URL =
  'https://api.twitch.tv/helix/moderation/moderators'

export async function getModerators(userId: string, accessToken: string) {
  try {
    const url = `${TWITCH_MODERATED_CHANNELS_URL}?broadcaster_id=${userId}`
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Client-Id': process.env.TWITCH_CLIENT_ID,
      },
    })

    if (!response.ok) {
      throw new Error(
        `Failed to fetch moderated channels: ${response.statusText}`
      )
    }

    const data = await response.json()
    return data.data
  } catch (error) {
    captureException(error)
    console.error('Failed to get moderated channels:', error)
    return { message: 'Failed to get moderated channels', error: error.message }
  }
}

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions)

  if (session?.user?.isImpersonating) {
    return res.status(403).json({ message: 'Forbidden' })
  }

  if (!session?.user?.id) {
    return res.status(403).json({ message: 'Forbidden' })
  }

  const { providerAccountId, accessToken, error } = await getTwitchTokens(
    session.user.id
  )
  if (error) {
    return res.status(403).json({ message: 'Forbidden' })
  }
  const response = await getModerators(providerAccountId, accessToken)
  return res.status(200).json(response)
}

export default withMethods(['GET'], withAuthentication(handler))
