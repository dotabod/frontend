import { captureException } from '@sentry/nextjs'
import fetch from 'node-fetch'
import { z } from 'zod'

import prisma from '@/lib/db'

const TWITCH_MODERATED_CHANNELS_URL = 'https://api.twitch.tv/helix/moderation/channels'

const moderatedChannelsResponseSchema = z.object({
  data: z.array(
    z.object({
      broadcaster_id: z.string(),
      broadcaster_login: z.string(),
      broadcaster_name: z.string(),
    }),
  ),
  pagination: z.object({ cursor: z.string().optional() }).optional(),
})

type ModeratedChannel = z.infer<typeof moderatedChannelsResponseSchema>['data'][number]

const fetchModeratedChannels = async function fetchModeratedChannels(
  userId: string,
  accessToken: string,
  after?: string,
): Promise<ModeratedChannel[]> {
  const url = new URL(TWITCH_MODERATED_CHANNELS_URL)
  url.searchParams.append('user_id', userId)
  url.searchParams.append('first', '100')
  if (after !== undefined && after.length > 0) {
    url.searchParams.append('after', after)
  }

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Client-Id': process.env.TWITCH_CLIENT_ID ?? '',
    },
    method: 'GET',
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch moderated channels: ${response.statusText}`)
  }

  const page = moderatedChannelsResponseSchema.parse(await response.json())
  const channels = page.data
  const nextCursor = page.pagination?.cursor
  if (nextCursor === undefined || nextCursor.length === 0) {
    return channels
  }

  return [...channels, ...(await fetchModeratedChannels(userId, accessToken, nextCursor))]
}

export const getModeratedChannels = async function getModeratedChannels(
  userId: string | undefined,
  accessToken: string,
) {
  try {
    if (userId === undefined || userId.length === 0) {
      throw new Error('User ID is required')
    }

    const moderatedChannels = await fetchModeratedChannels(userId, accessToken)
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

    return userModeratedChannels.map((account) => ({
      image: account.user.image,
      name: account.user.name,
      providerAccountId: account.providerAccountId,
    }))
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error))
    captureException(err)
    console.error('Failed to get moderated channels:', err)
    return { error: err.message, message: 'Failed to get moderated channels' }
  }
}
