import { captureException } from '@sentry/nextjs'
import type { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from '@/lib/api/getServerSession'
import { withMethods } from '@/lib/api-middlewares/with-methods'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/db'
import { getTwitchTokens } from '../../lib/getTwitchTokens'

async function checkBan(broadcasterId: string | undefined, accessToken: string) {
  if (!broadcasterId) {
    throw new Error('Broadcaster ID is required')
  }
  const checkUrl = `https://api.twitch.tv/helix/moderation/banned?broadcaster_id=${broadcasterId}&user_id=${process.env.TWITCH_BOT_PROVIDERID}`
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    'Client-Id': process.env.TWITCH_CLIENT_ID ?? '',
  }

  try {
    const checkResponse = await fetch(checkUrl, { method: 'GET', headers })
    if (!checkResponse.ok) {
      throw new Error(`Failed to get banned info: ${checkResponse.statusText}`)
    }
    const checkData = await checkResponse.json()
    if (checkData.data && checkData.data.length > 0) {
      return { banned: true }
    }
    return { banned: false }
  } catch (error) {
    captureException(error)
    return { message: 'Error', error: error.message }
  }
}

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method Not Allowed' })
  }

  const session = await getServerSession(req, res, authOptions)

  if (!session?.user?.id) {
    return res.status(403).json({ message: 'Forbidden' })
  }

  try {
    res.setHeader('Cache-Control', 'private, max-age=15, stale-while-revalidate=30')

    const { providerAccountId, accessToken, error } = await getTwitchTokens(session.user.id)
    if (error) {
      return res.status(403).json({ message: 'Forbidden' })
    }

    const banResponse = await checkBan(providerAccountId, accessToken)

    // Also check for disable reasons related to bot bans
    const commandDisableSetting = await prisma.setting.findFirst({
      where: {
        userId: session.user.id,
        key: 'commandDisable',
      },
      select: {
        value: true,
        disableReason: true,
        autoDisabledAt: true,
        disableMetadata: true,
      },
    })

    const response = {
      ...banResponse,
      disabled: commandDisableSetting?.value === true,
      disableReason: commandDisableSetting?.disableReason,
      disabledAt: commandDisableSetting?.autoDisabledAt,
      disableMetadata: commandDisableSetting?.disableMetadata,
    }

    return res.status(200).json(response)
  } catch (error) {
    captureException(error)
    return res.status(500).json({ message: 'Failed to get ban info', error: error.message })
  }
}

export default withMethods(['GET'], handler)
