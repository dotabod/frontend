import { captureException } from '@sentry/nextjs'
import fetch from 'node-fetch'
import prisma from '@/lib/db'

const TWITCH_VALIDATE_URL = 'https://id.twitch.tv/oauth2/validate'
const TWITCH_TOKEN_URL = 'https://id.twitch.tv/oauth2/token'
const CLIENT_ID = process.env.TWITCH_CLIENT_ID
const CLIENT_SECRET = process.env.TWITCH_CLIENT_SECRET

if (!CLIENT_ID || !CLIENT_SECRET) {
  throw new Error('TWITCH_CLIENT_ID or TWITCH_CLIENT_SECRET is not set')
}

async function validateToken(accessToken: string) {
  const response = await fetch(TWITCH_VALIDATE_URL, {
    headers: {
      Authorization: `OAuth ${accessToken}`,
    },
    method: 'GET',
  })
  return response
}

async function refreshToken(refreshToken: string) {
  const response = await fetch(TWITCH_TOKEN_URL, {
    body: new URLSearchParams({
      client_id: CLIENT_ID ?? '',
      client_secret: CLIENT_SECRET ?? '',
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    method: 'POST',
  })
  return response
}

export async function getTwitchTokens(userId: string) {
  try {
    const user = await prisma.user.findFirst({
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        Account: {
          select: {
            access_token: true,
            providerAccountId: true,
            refresh_token: true,
          },
        },
        id: true,
        name: true,
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
        error: true,
        message: 'No provider account ID found',
      }
    }

    const validateResponse = await validateToken(user.Account.access_token)
    if (validateResponse.status === 200) {
      return {
        accessToken: user.Account.access_token,
        providerAccountId: user.Account.providerAccountId,
      }
    }
    if (validateResponse.status === 401) {
      const refreshResponse = await refreshToken(user.Account.refresh_token)
      if (refreshResponse.status === 200) {
        const newTokens = await refreshResponse.json()
        await prisma.user.update({
          data: {
            Account: {
              update: {
                access_token: newTokens.access_token,
                refresh_token: newTokens.refresh_token,
                updatedAt: new Date(),
              },
            },
          },
          where: { id: userId },
        })
        return {
          accessToken: newTokens.access_token,
          providerAccountId: user.Account.providerAccountId,
        }
      }
      return {
        error: await refreshResponse.json(),
        message: 'Failed to refresh token',
      }
    }
    return {
      error: await validateResponse.json(),
      message: 'Failed to validate token',
    }
  } catch (error) {
    captureException(error)
    return {
      error: error instanceof Error ? error.message : String(error),
      message: 'Failed to get info',
    }
  }
}
