import prisma from '@/lib/db'
import { captureException } from '@sentry/nextjs'
import fetch from 'node-fetch'

const TWITCH_VALIDATE_URL = 'https://id.twitch.tv/oauth2/validate'
const TWITCH_TOKEN_URL = 'https://id.twitch.tv/oauth2/token'
const CLIENT_ID = process.env.TWITCH_CLIENT_ID
const CLIENT_SECRET = process.env.TWITCH_CLIENT_SECRET

async function validateToken(accessToken: string) {
  const response = await fetch(TWITCH_VALIDATE_URL, {
    method: 'GET',
    headers: {
      Authorization: `OAuth ${accessToken}`,
    },
  })
  return response
}

async function refreshToken(refreshToken: string) {
  const response = await fetch(TWITCH_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
    }),
  })
  return response
}

export async function getTwitchTokens(userId: string) {
  try {
    const user = await prisma.user.findFirst({
      select: {
        id: true,
        name: true,
        Account: {
          select: {
            providerAccountId: true,
            access_token: true,
            refresh_token: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      where: {
        Account: {
          scope: {
            // Their latest token should have scopes required for calling the Twitch API
            contains: 'moderator:read:followers',
          },
        },
        id: userId,
      },
    })

    if (!user?.Account?.providerAccountId) {
      return {
        message: 'No provider account ID found',
        error: true,
      }
    }

    const validateResponse = await validateToken(user.Account.access_token)
    if (validateResponse.status === 200) {
      return {
        providerAccountId: user.Account.providerAccountId,
        accessToken: user.Account.access_token,
      }
    }
    if (validateResponse.status === 401) {
      const refreshResponse = await refreshToken(user.Account.refresh_token)
      if (refreshResponse.status === 200) {
        const newTokens = await refreshResponse.json()
        await prisma.user.update({
          where: { id: userId },
          data: {
            Account: {
              update: {
                access_token: newTokens.access_token,
                refresh_token: newTokens.refresh_token,
              },
            },
          },
        })
        return {
          providerAccountId: user.Account.providerAccountId,
          accessToken: newTokens.access_token,
        }
      }
      return {
        message: 'Failed to refresh token',
        error: await refreshResponse.json(),
      }
    }
    return {
      message: 'Failed to validate token',
      error: await validateResponse.json(),
    }
  } catch (error) {
    captureException(error)
    return { message: 'Failed to get info', error: error.message }
  }
}
