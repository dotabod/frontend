import { withAuthentication } from '@/lib/api-middlewares/with-authentication'
import { withMethods } from '@/lib/api-middlewares/with-methods'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/db'
import { getTwitchTokens } from '@/lib/getTwitchTokens'
import { captureException } from '@sentry/nextjs'
import type { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import fetch from 'node-fetch'

const TWITCH_MODERATED_CHANNELS_URL =
  'https://api.twitch.tv/helix/moderation/channels'

async function getModeratedChannels(userId: string, accessToken: string) {
  try {
    const url = `${TWITCH_MODERATED_CHANNELS_URL}?user_id=${userId}`
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
    const moderatedChannels = data.data

    const userModeratedChannels = await prisma.account.findMany({
      where: {
        providerAccountId: {
          in: moderatedChannels.map((channel) => channel.broadcaster_id),
        },
      },
      select: {
        user: {
          select: {
            name: true,
            image: true,
          },
        },
        providerAccountId: true,
      },
    })

    const flattenedResponse = userModeratedChannels.map((account) => ({
      providerAccountId: account.providerAccountId,
      name: account.user.name,
      image: account.user.image,
    }))

    return flattenedResponse
  } catch (error) {
    captureException(error)
    console.error('Failed to get moderated channels:', error)
    return { message: 'Failed to get moderated channels', error: error.message }
  }
}

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions)

  if (!session?.user?.id) {
    return res.status(403).json({ message: 'Forbidden' })
  }

  const { providerAccountId, accessToken } = await getTwitchTokens(
    session.user.id
  )
  const response = await getModeratedChannels(providerAccountId, accessToken)
  return res.status(200).json(response)
}

export default withMethods(['GET'], withAuthentication(handler))
