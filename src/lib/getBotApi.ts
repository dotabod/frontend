import { RefreshingAuthProvider } from '@twurple/auth'
import { ApiClient } from '@twurple/api'
import prisma from '@/lib/db'

export const hasTokens =
  process.env.TWITCH_CLIENT_ID && process.env.TWITCH_CLIENT_SECRET

export async function getBotTokens() {
  return await prisma.account.findFirst({
    select: {
      refresh_token: true,
      access_token: true,
      expires_in: true,
      scope: true,
      obtainment_timestamp: true,
    },
    where: {
      provider: 'twitch',
      providerAccountId: process.env.TWITCH_BOT_PROVIDERID!,
    },
  })
}

export const getAuthProvider = async function () {
  if (!hasTokens) {
    throw new Error('Missing twitch tokens')
  }
  const botTokens = await getBotTokens()
  if (!botTokens?.access_token || !botTokens.refresh_token) {
    console.error('[TWITCHSETUP] Missing bot tokens', {
      twitchId: process.env.TWITCH_BOT_PROVIDERID,
    })
    return false
  }

  const twitchId = process.env.TWITCH_BOT_PROVIDERID

  const authProvider = new RefreshingAuthProvider(
    {
      clientId: process.env.TWITCH_CLIENT_ID ?? '',
      clientSecret: process.env.TWITCH_CLIENT_SECRET ?? '',
      onRefresh: (newTokenData) => {
        console.log('[TWITCHSETUP] Refreshing twitch tokens', { twitchId })

        prisma.account
          .update({
            where: {
              providerAccountId: twitchId,
            },
            data: {
              scope: newTokenData.scope.join(' '),
              access_token: newTokenData.accessToken,
              refresh_token:
                newTokenData.refreshToken ?? botTokens.refresh_token,
              expires_at: Math.floor(
                new Date(newTokenData.obtainmentTimestamp).getTime() / 1000 +
                  (newTokenData.expiresIn ?? 0)
              ),
              expires_in: newTokenData.expiresIn ?? 0,
              obtainment_timestamp: new Date(newTokenData.obtainmentTimestamp),
            },
          })
          .then(() => {
            console.log('[TWITCHSETUP] Updated bot tokens', { twitchId })
          })
          .catch((e) => {
            console.error('[TWITCHSETUP] Failed to update bot tokens', {
              twitchId,
              error: e,
            })
          })
      },
    },
    {
      scope: botTokens.scope?.split(' ') ?? [],
      expiresIn: botTokens.expires_in ?? 0,
      obtainmentTimestamp: botTokens.obtainment_timestamp?.getTime() ?? 0,
      accessToken: botTokens.access_token,
      refreshToken: botTokens.refresh_token,
    }
  )

  return authProvider
}

export const getBotAPI = async function () {
  const authProvider = await getAuthProvider()
  if (authProvider === false) throw new Error('Missing authProvider')
  const api = new ApiClient({ authProvider })
  console.log('[TWITCH]', 'Retrieved twitch dotabod api')

  return api
}
