import { SubscriptionStatus } from '@prisma/client'
import type { NextApiRequest, NextApiResponse } from 'next'

import { withAuthentication } from '@/lib/api-middlewares/with-authentication'
import { withMethods } from '@/lib/api-middlewares/with-methods'
import { getServerSession } from '@/lib/api/get-server-session'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/db'
import { getTwitchTokens } from '@/lib/get-twitch-tokens'
import { getModeratedChannels } from '@/lib/twitch-moderated-channels'
import { GENERIC_FEATURE_TIERS, isInGracePeriod } from '@/utils/subscription'

const handler = async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions)
  const search = req.query.search as string | undefined

  if (!session?.user?.id) {
    res.status(403).json({ message: 'Forbidden' })
    return
  }

  if (session?.user?.isImpersonating) {
    res.status(403).json({ message: 'Forbidden' })
    return
  }

  if (search && !session?.user?.role?.includes('admin')) {
    res.status(403).json({ message: 'Forbidden' })
    return
  }

  if (search !== undefined && !search.trim()) {
    res.status(200).json([])
    return
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
    res.status(200).json(
      users.map((user) => ({
        image: user.user.image,
        label: user.user.name,
        value: user.providerAccountId,
      })),
    )
    return
  }

  const { providerAccountId, accessToken, error } = await getTwitchTokens(session.user.id)
  if (error) {
    res.status(403).json({ message: 'Forbidden' })
    return
  }

  const response = await getModeratedChannels(providerAccountId, accessToken)

  // Handle the case where response might not be an array
  let filteredResponse = Array.isArray(response) ? [...response] : []

  if (!Array.isArray(response)) {
    res.status(200).json([])
    return
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

  res.status(200).json(filteredResponse)
}

export default withMethods(['GET'], withAuthentication(handler))
