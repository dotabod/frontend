import { RefreshingAuthProvider } from '@twurple/auth'
import { ApiClient } from '@twurple/api'

export const hasTokens =
  process.env.TWITCH_ACCESS_TOKEN &&
  process.env.TWITCH_REFRESH_TOKEN &&
  process.env.TWITCH_CLIENT_ID &&
  process.env.TWITCH_CLIENT_SECRET

export const getAuthProvider = function () {
  if (!hasTokens) {
    throw new Error('Missing twitch tokens')
  }

  const authProvider = new RefreshingAuthProvider(
    {
      clientId: process.env.TWITCH_CLIENT_ID || '',
      clientSecret: process.env.TWITCH_CLIENT_SECRET || '',
    },
    {
      expiresIn: 86400,
      obtainmentTimestamp: Date.now(),
      accessToken: process.env.TWITCH_ACCESS_TOKEN || '',
      refreshToken: process.env.TWITCH_REFRESH_TOKEN || '',
    }
  )

  return authProvider
}

export const getBotAPI = function () {
  const authProvider = getAuthProvider()
  const api = new ApiClient({ authProvider })
  console.log('[TWITCH]', 'Retrieved twitch dotabod api')

  return api
}
