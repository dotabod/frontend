import { SubscriptionStatus } from '@prisma/client'
import { captureException } from '@sentry/nextjs'
import type { NextApiRequest, NextApiResponse } from 'next'
import fetch from 'node-fetch'
import { getServerSession } from '@/lib/api/getServerSession'
import { withAuthentication } from '@/lib/api-middlewares/with-authentication'
import { withMethods } from '@/lib/api-middlewares/with-methods'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/db'
import { getTwitchTokens } from '@/lib/getTwitchTokens'
import { GENERIC_FEATURE_TIERS, isInGracePeriod } from '@/utils/subscription'

const TWITCH_MODERATED_CHANNELS_URL = 'https://api.twitch.tv/helix/moderation/channels'

export async function getModeratedChannels(userId: string | undefined, accessToken: string) {
  try {
    if (!userId) {
      throw new Error('User ID is required')
    }

    const moderatedChannels: {
      broadcaster_id: string
      broadcaster_login: string
      broadcaster_name: string
    }[] = []
    let after: string | undefined
    const first = 100 // Maximum items per page

    do {
      const url = new URL(TWITCH_MODERATED_CHANNELS_URL)
      url.searchParams.append('user_id', userId)
      url.searchParams.append('first', first.toString())
      if (after) {
        url.searchParams.append('after', after)
      }

      const response = await fetch(url.toString(), {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Client-Id': process.env.TWITCH_CLIENT_ID || '',
        },
        method: 'GET',
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch moderated channels: ${response.statusText}`)
      }

      const data = await response.json()
      if (Array.isArray(data.data)) {
        moderatedChannels.push(...data.data)
      }

      after = data.pagination?.cursor
    } while (after)

    const broadcasterIds = moderatedChannels.map((channel) => channel.broadcaster_id)

    const userModeratedChannels = await prisma.account.findMany({
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
        providerAccountId: {
          in: broadcasterIds,
        },
      },
    })

    const flattenedResponse = userModeratedChannels.map((account) => ({
      image: account.user.image,
      name: account.user.name,
      providerAccountId: account.providerAccountId,
    }))

    return flattenedResponse
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error))
    captureException(err)
    console.error('Failed to get moderated channels:', err)
    return { error: err.message, message: 'Failed to get moderated channels' }
  }
}

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions)
  const search = req.query.search as string | undefined

  if (!session?.user?.id) {
    return res.status(403).json({ message: 'Forbidden' })
  }

  if (session?.user?.isImpersonating) {
    return res.status(403).json({ message: 'Forbidden' })
  }

  if (search && !session?.user?.role?.includes('admin')) {
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
      take: 10,
      where: {
        OR: [
          { providerAccountId: { contains: search.toLowerCase().trim() } },
          { user: { name: { contains: search.toLowerCase().trim() } } },
        ],
      },
    })
    return res.status(200).json(
      users.map((user) => ({
        image: user.user.image,
        label: user.user.name,
        value: user.providerAccountId,
      })),
    )
  }

  const { providerAccountId, accessToken, error } = await getTwitchTokens(session.user.id)
  if (error) {
    return res.status(403).json({ message: 'Forbidden' })
  }

  const response = await getModeratedChannels(providerAccountId, accessToken)

  // Handle the case where response might not be an array
  let filteredResponse = Array.isArray(response) ? [...response] : []

  if (!Array.isArray(response)) {
    return res.status(200).json([])
  }

  // Filter response to only include channels with required tier
  if (!isInGracePeriod()) {
    // Get channels that have the required tier
    const eligibleChannels = await prisma.account.findMany({
      select: {
        providerAccountId: true,
      },
      where: {
        user: {
          subscription: {
            some: {
              status: {
                in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIALING],
              },
              tier: GENERIC_FEATURE_TIERS.managers,
            },
          },
        },
      },
    })

    const eligibleChannelIds = new Set(eligibleChannels.map((c) => c.providerAccountId))
    filteredResponse = response.filter((channel) =>
      eligibleChannelIds.has(channel.providerAccountId),
    )
  }

  return res.status(200).json(filteredResponse)
}

export default withMethods(['GET'], withAuthentication(handler))
