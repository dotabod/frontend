import { captureException } from '@sentry/nextjs'
import type { NextApiRequest, NextApiResponse } from 'next'

import { withAuthentication } from '@/lib/api-middlewares/with-authentication'
import { withMethods } from '@/lib/api-middlewares/with-methods'
import { getServerSession } from '@/lib/api/get-server-session'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/db'
import { getTwitchTokens } from '@/lib/get-twitch-tokens'

// Helper function to fetch follower count for a user
const fetchFollowerCount = async function fetchFollowerCount(
  providerAccountId: string,
  accessToken: string,
) {
  const url = `https://api.twitch.tv/helix/channels/followers?broadcaster_id=${Number(
    providerAccountId,
  )}`
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    'Client-Id': process.env.TWITCH_CLIENT_ID ?? '',
  }

  try {
    const response = await fetch(url, { headers })
    if (!response.ok) {
      throw new Error(
        `Failed to fetch followers for providerAccountId ${providerAccountId}: ${response.statusText}`,
      )
    }
    const data = await response.json()
    return data.total
  } catch (error) {
    captureException(error)
    // Handle error gracefully, possibly returning null or a default value
    return null
  }
}

// Main function to update followers count
const updateFollows = async function updateFollows(userId: string) {
  const { providerAccountId, accessToken, error } = await getTwitchTokens(userId)
  if (error) {
    return
  }

  if (!providerAccountId || !accessToken) {
    return
  }

  const totalFollowerCount = await fetchFollowerCount(providerAccountId, accessToken)

  if (totalFollowerCount === null) {
    // Console.log(`Failed to update followers for user ${user.name}`)
    // Do nothing
  } else {
    await prisma.user.update({
      data: { followers: totalFollowerCount, updatedAt: new Date() },
      where: { id: userId },
    })
    console.log(`Updated followers for user ${userId} to ${totalFollowerCount}`)
  }
}

const handler = async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(500).end()
  }

  const session = await getServerSession(req, res, authOptions)
  if (session?.user?.isImpersonating) {
    res.status(403).json({ message: 'Forbidden' })
    return
  }
  if (!session?.user?.id) {
    return res.status(403).end()
  }

  try {
    await updateFollows(session.user.id)
    return res.status(200).end('Followers updated successfully')
  } catch (error) {
    captureException(error)
    console.error('Failed to update followers:', error)
    return res.status(500).end('Failed to update followers')
  }
}

export default withMethods(['GET'], withAuthentication(handler))
