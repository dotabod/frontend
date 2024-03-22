import { NextApiRequest, NextApiResponse } from 'next'

import prisma from '@/lib/db'
import { withMethods } from '@/lib/api-middlewares/with-methods'

const usersWithErrors = []

async function validateAccessToken(accessToken: string) {
  const url = 'https://id.twitch.tv/oauth2/validate'
  const headers = {
    Authorization: `Bearer ${accessToken}`,
  }

  try {
    const response = await fetch(url, { headers })

    if (response.ok) {
      const data = await response.json()
      return data
    }
  } catch (error) {
    console.error('Failed to validate access token:', error)
  }

  return null
}

// Helper function to refresh access token
async function refreshAccessToken(refreshToken: string) {
  const url = `https://id.twitch.tv/oauth2/token?grant_type=refresh_token&refresh_token=${refreshToken}&client_id=${process.env.TWITCH_CLIENT_ID}&client_secret=${process.env.TWITCH_CLIENT_SECRET}`

  try {
    const response = await fetch(url, { method: 'POST' })
    if (!response.ok) {
      throw new Error(`Failed to refresh access token: ${response.statusText}`)
    }
    const data = await response.json()
    return data.access_token
  } catch (error) {
    return null
  }
}

// Helper function to fetch follower count for a user
async function fetchFollowerCount(
  providerAccountId,
  accessToken,
  refreshToken
) {
  const url = `https://api.twitch.tv/helix/channels/followers?broadcaster_id=${Number(
    providerAccountId
  )}`
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    'Client-Id': process.env.TWITCH_CLIENT_ID,
  }

  try {
    const response = await fetch(url, { headers })
    if (response.status === 401) {
      // Refresh access token
      const newAccessToken = await refreshAccessToken(refreshToken)
      if (newAccessToken) {
        // Retry with new access token
        return fetchFollowerCount(
          providerAccountId,
          newAccessToken,
          refreshToken
        )
      }
    }
    if (!response.ok) {
      // log the streamed awaited response body
      // console.log(await response.text())
      throw new Error(
        `Failed to fetch followers for providerAccountId ${providerAccountId}: ${response.statusText}`
      )
    }
    const data = await response.json()
    return data.total
  } catch (error) {
    return null // Handle error gracefully, possibly returning null or a default value
  }
}

// Main function to update followers count
async function updateFollows(res: NextApiResponse) {
  if (process.env.NODE_ENV !== 'development') {
    console.log('Not in development mode, skipping updateFollows')
    return
  }

  const pageSize = 100
  let page = 0
  const updates = []

  try {
    console.log('fetching new users', page)
    const users = await prisma.user.findMany({
      skip: page * pageSize,
      take: pageSize,
      where: {
        Account: {
          requires_refresh: false,
        },
        followers: null,
      },
      include: {
        Account: true,
      },
    })

    console.log(users.length)

    const promises = users.map((user) => {
      if (!user.Account?.providerAccountId) return null

      // Return a promise that resolves to an object containing the user and the follower count
      return fetchFollowerCount(
        user.Account.providerAccountId,
        user.Account.access_token,
        user.Account.refresh_token
      ).then((totalFollowerCount) => ({ user, totalFollowerCount }))
    })
    const results = await Promise.all(promises)

    // Filter out null results and update the users
    for (const result of results) {
      if (result && result.totalFollowerCount !== null) {
        updates.push(
          prisma.user.update({
            where: { id: result.user.id },
            data: { followers: result.totalFollowerCount },
          })
        )

        console.log(
          `Updated followers for user ${result.user.name} to ${result.totalFollowerCount}`
        )
      } else if (result) {
        updates.push(
          prisma.account.update({
            where: {
              providerAccountId: result.user.Account.providerAccountId,
            },
            data: { requires_refresh: true },
          })
        )

        console.error(`Failed to update followers for user ${result.user.name}`)
      }
    }

    // Execute all updates in a single transaction
    await prisma.$transaction(updates)

    page++
  } catch (error) {
    console.error('Big catch on something', error)
  }
}

async function checkInvalidTokens() {
  // get the access token from usersWithErrors providerAccountIds
  for (const providerAccountId of usersWithErrors) {
    const user = await prisma.user.findFirst({
      where: {
        Account: {
          providerAccountId,
        },
      },
      include: {
        Account: true,
      },
    })

    if (!user) {
      console.error(`User not found for providerAccountId ${providerAccountId}`)
      continue
    }

    const accessToken = user.Account?.access_token
    if (!accessToken) {
      console.error(
        `Access token not found for providerAccountId ${providerAccountId}`
      )
      continue
    }

    const data = await validateAccessToken(accessToken)
    if (!data) {
      console.error(
        `Failed to validate access token for providerAccountId ${providerAccountId}`
      )
      // try to refresh the token
      const newAccessToken = await refreshAccessToken(
        user.Account.refresh_token
      )
      if (newAccessToken) {
        console.log(
          `Refreshed access token for providerAccountId ${providerAccountId}`
        )
      } else {
        console.error(
          `Failed to refresh access token for providerAccountId ${providerAccountId}`
        )
      }
      continue
    }

    if (data.client_id !== process.env.TWITCH_CLIENT_ID) {
      console.error(
        `Invalid client ID for providerAccountId ${providerAccountId}`
      )
      continue
    }

    if (data.login !== user.name) {
      console.error(`Invalid user for providerAccountId ${providerAccountId}`)
      continue
    }

    if (data.expires_in < 60) {
      console.error(
        `Access token for providerAccountId ${providerAccountId} is about to expire`
      )
    }

    console.log(
      `Access token for providerAccountId ${providerAccountId} is valid`
    )
  }
}

// with requires_refresh = true
async function updateInvalidTokens() {
  const updates = []
  for (const providerAccountId of usersWithErrors) {
    updates.push(
      prisma.account.update({
        where: { providerAccountId: providerAccountId },
        data: { requires_refresh: true },
      })
    )
  }

  await prisma.$transaction(updates)
}

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(500).end()
  }

  await updateFollows(res)
  // await updateInvalidTokens()
  res.end()
}

export default withMethods(['GET'], handler)
