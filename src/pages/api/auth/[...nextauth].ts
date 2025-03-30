import { authOptions as baseAuthOptions } from '@/lib/auth'
import NextAuth from 'next-auth'
import TwitchProvider from 'next-auth/providers/twitch'

// Override authOptions for this specific route to use minimal scopes for verification
const chatVerifyScopes = ['user:read:email', 'openid'].join(' ')

// Custom API handler that checks the request URL before applying NextAuth
export default async function auth(req, res) {
  // Clone the auth options to avoid modifying the original
  const authOptions = { ...baseAuthOptions }

  // Check if the request is for the verify page
  const isVerifyRequest = req.headers?.referer?.includes('verify')

  if (isVerifyRequest) {
    // Find the Twitch provider
    const twitchProviderIndex = authOptions.providers.findIndex(
      (provider) => provider.id === 'twitch',
    )

    if (twitchProviderIndex !== -1) {
      // Check if environment variables are available
      if (!process.env.TWITCH_CLIENT_ID || !process.env.TWITCH_CLIENT_SECRET) {
        throw new Error('TWITCH_CLIENT_ID or TWITCH_CLIENT_SECRET is not set')
      }

      // Create a new Twitch provider with minimal scopes for verification
      authOptions.providers[twitchProviderIndex] = TwitchProvider({
        clientId: process.env.TWITCH_CLIENT_ID,
        clientSecret: process.env.TWITCH_CLIENT_SECRET,
        allowDangerousEmailAccountLinking: true,
        authorization: {
          params: {
            scope: chatVerifyScopes,
          },
        },
      })
    }
  }

  // Apply NextAuth with the potentially modified authOptions
  return await NextAuth(req, res, authOptions)
}
