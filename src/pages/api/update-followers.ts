import type { NextApiRequest, NextApiResponse } from 'next'

import { withAuthentication } from '@/lib/api-middlewares/with-authentication'
import { withMethods } from '@/lib/api-middlewares/with-methods'
import { getServerSession } from '@/lib/api/getServerSession'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/db'
import { getTwitchTokens } from '@/lib/getTwitchTokens'
import { captureException } from '@sentry/nextjs'

// Helper function to fetch follower count for a user
async function fetchFollowerCount(providerAccountId, accessToken) {
  const url = `https://api.twitch.tv/helix/channels/followers?broadcaster_id=${Number(
    providerAccountId
  )}`
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    'Client-Id': process.env.TWITCH_CLIENT_ID,
  }

  try {
    const response = await fetch(url, { headers })
    if (!response.ok) {
      throw new Error(
        `Failed to fetch followers for providerAccountId ${providerAccountId}: ${response.statusText}`
      )
    }
    const data = await response.json()
    return data.total
  } catch (error) {
    captureException(error)
    return null // Handle error gracefully, possibly returning null or a default value
  }
}

// Main function to update followers count
async function updateFollows(userId: string) {
  const { providerAccountId, accessToken } = await getTwitchTokens(userId)

  const totalFollowerCount = await fetchFollowerCount(
    providerAccountId,
    accessToken
  )

  if (totalFollowerCount !== null) {
    await prisma.user.update({
      where: { id: userId },
      data: { followers: totalFollowerCount },
    })
    console.log(`Updated followers for user ${userId} to ${totalFollowerCount}`)
  } else {
    // console.log(`Failed to update followers for user ${user.name}`)
    // do nothing
  }
}

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(500).end()
  }

  const session = await getServerSession(req, res, authOptions)
  if (session?.user?.isImpersonating) {
    return res.status(403).json({ message: 'Forbidden' })
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
