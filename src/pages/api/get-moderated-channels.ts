import { withAuthentication } from '@/lib/api-middlewares/with-authentication'
import { withMethods } from '@/lib/api-middlewares/with-methods'
import { getServerSession } from '@/lib/api/getServerSession'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/db'
import { getTwitchTokens } from '@/lib/getTwitchTokens'
import { captureException } from '@sentry/nextjs'
import type { NextApiRequest, NextApiResponse } from 'next'
import fetch from 'node-fetch'

const TWITCH_MODERATED_CHANNELS_URL =
  'https://api.twitch.tv/helix/moderation/channels'

export async function getModeratedChannels(
  userId: string,
  accessToken: string
) {
  try {
    const moderatedChannels: {
      broadcaster_id: string
      broadcaster_login: string
      broadcaster_name: string
    }[] = []
    let after: string | undefined = undefined
    const first = 100 // Maximum items per page

    do {
      const url = new URL(TWITCH_MODERATED_CHANNELS_URL)
      url.searchParams.append('user_id', userId)
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
        throw new Error(
          `Failed to fetch moderated channels: ${response.statusText}`
        )
      }

      const data = await response.json()
      if (Array.isArray(data.data)) {
        moderatedChannels.push(...data.data)
      }

      after = data.pagination?.cursor
    } while (after)

    const broadcasterIds = moderatedChannels.map(
      (channel) => channel.broadcaster_id
    )

    const userModeratedChannels = await prisma.account.findMany({
      where: {
        providerAccountId: {
          in: broadcasterIds,
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
  } catch (error: any) {
    captureException(error)
    console.error('Failed to get moderated channels:', error)
    return { message: 'Failed to get moderated channels', error: error.message }
  }
}
async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions)
  const search = req.query.search as string | undefined

  if (session?.user?.isImpersonating) {
    return res.status(403).json({ message: 'Forbidden' })
  }

  if (!session?.user?.id) {
    return res.status(403).json({ message: 'Forbidden' })
  }

  if (search && (!session?.user?.role || !session.user.role.includes('admin'))) {
    return res.status(403).json({ message: 'Forbidden' })
  }

  if (search !== undefined && !search.trim()) {
    return res.status(200).json([])
  }

  if (search?.trim()) {
    const users = await prisma.account.findMany({
      select: {
        providerAccountId: true,
        user: {
          select: {
            image: true,
            name: true,
          },
        },
      },
      where: {
        OR: [
          { providerAccountId: { contains: search.toLowerCase().trim() } },
          { user: { name: { contains: search.toLowerCase().trim() } } },
        ],
      },
      take: 10,
    })
    return res.status(200).json(users.map((user) => ({
      value: user.providerAccountId,
      label: user.user.name,
      image: user.user.image,
    })))
  }

  const { providerAccountId, accessToken, error } = await getTwitchTokens(
    session.user.id
  )
  if (error) {
    return res.status(403).json({ message: 'Forbidden' })
  }
  const response = await getModeratedChannels(providerAccountId, accessToken)
  return res.status(200).json(response)
}

export default withMethods(['GET'], withAuthentication(handler))
