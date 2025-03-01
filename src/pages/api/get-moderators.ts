import { withAuthentication } from '@/lib/api-middlewares/with-authentication'
import { withMethods } from '@/lib/api-middlewares/with-methods'
import { getServerSession } from '@/lib/api/getServerSession'
import { authOptions } from '@/lib/auth'
import { getTwitchTokens } from '@/lib/getTwitchTokens'
import { canAccessFeature, getSubscription } from '@/utils/subscription'
import { captureException } from '@sentry/nextjs'
import type { NextApiRequest, NextApiResponse } from 'next'
import fetch from 'node-fetch'

const TWITCH_MODERATED_CHANNELS_URL = 'https://api.twitch.tv/helix/moderation/moderators'

export async function getModerators(userId: string | undefined, accessToken: string) {
  if (!userId) {
    throw new Error('User ID is required')
  }

  try {
    const allModerators: {
      user_id: string
      user_login: string
      user_name: string
    }[] = []
    let after: string | undefined = undefined
    const first = 100 // Maximum items per page

    do {
      const url = new URL(TWITCH_MODERATED_CHANNELS_URL)
      url.searchParams.append('broadcaster_id', userId)
      url.searchParams.append('first', first.toString())
      if (after) {
        url.searchParams.append('after', after)
      }

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Client-Id': process.env.TWITCH_CLIENT_ID || '',
        },
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch moderated channels: ${response.statusText}`)
      }

      const data = await response.json()
      if (Array.isArray(data.data)) {
        allModerators.push(...data.data)
      }

      after = data.pagination?.cursor
    } while (after)

    return allModerators
  } catch (error: any) {
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

  const subscription = await getSubscription(session.user.id)
  const tierAccess = canAccessFeature('managers', subscription)

  if (!tierAccess.hasAccess) {
    return res.status(403).json({
      error: true,
      message: 'This feature requires a subscription',
    })
  }

  const { providerAccountId, accessToken, error } = await getTwitchTokens(session.user.id)
  if (error) {
    return res.status(403).json({ message: 'Forbidden' })
  }
  const response = await getModerators(providerAccountId, accessToken)
  return res.status(200).json(response)
}

export default withMethods(['GET'], withAuthentication(handler))
