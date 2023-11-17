import TwitchProvider from 'next-auth/providers/twitch'
import GoogleProvider from 'next-auth/providers/google'
import { NextAuthOptions } from 'next-auth'
import { PrismaAdapter } from '@next-auth/prisma-adapter'

import prisma from '@/lib/db'
import fetchLiveChatId from './fetchYouTubeData'

// Do not delete this declaration
const chatBotTwitchScopes = [
  'channel:moderate',
  'chat:edit',
  'chat:read',
  'whispers:read',
  'whispers:edit',
  'moderator:manage:chat_messages',
].join(' ')

const defaultTwitchScopes = [
  'openid',
  'user:read:email',
  'channel:manage:predictions',
  'channel:manage:polls',
  'channel:read:predictions',
  'channel:read:polls',
].join(' ')

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: 'jwt',
  },
  pages: {
    signIn: '/login',
  },
  providers: [
    GoogleProvider({
      clientId: process.env.YOUTUBE_CLIENT_ID,
      clientSecret: process.env.YOUTUBE_CLIENT_SECRET,
      authorization: {
        params: {
          scope:
            'openid email profile https://www.googleapis.com/auth/youtube.readonly',
          prompt: 'consent',
          access_type: 'offline',
          response_type: 'code',
        },
      },
    }),
    TwitchProvider({
      allowDangerousEmailAccountLinking: true,
      clientId: process.env.TWITCH_CLIENT_ID,
      clientSecret: process.env.TWITCH_CLIENT_SECRET,
      authorization: {
        params: {
          // when logging in with the chatbot, append the chatbot scopes
          // scope: `${defaultScopes} ${chatBotScopes}`,
          scope: defaultTwitchScopes,
        },
      },
    }),
  ],
  callbacks: {
    async session({ token, session }) {
      if (token) {
        session.user.locale = token.locale
        session.user.twitchId = token.twitchId
        session.user.id = token.id
        session.user.name = token.name
        session.user.email = token.email
        session.user.image = token.picture
      }

      return session
    },
    // @ts-ignore
    async jwt({ token, account, user, profile, isNewUser }) {
      // Save a db lookup
      if (token.id) return token

      if (!user) {
        token.id = token.sub
        return token
      }

      const newUser = {
        email: profile.email || user.email,
        // @ts-ignore from twitch?
        name: user.displayName || user.name || profile?.preferred_username,
        displayName:
          // @ts-ignore from twitch?
          profile?.preferred_username || user.displayName || user.name,
        // @ts-ignore from twitch?
        image: profile?.picture || user.image,
      }

      const provider = await prisma.user.findFirst({
        where: {
          id: token.id || user.id || profile.sub,
        },
        select: {
          accounts: {
            select: {
              requires_refresh: true,
              providerAccountId: true,
              provider: true,
            },
          },
          locale: true,
        },
      })

      // The dotabod user shouldn't update because
      // it has specific scopes that we don't want to overwrite
      // see `chatBotScopes` above
      const isDotabod =
        (newUser.displayName || newUser.name) === 'dotabod' ||
        (newUser.displayName || newUser.name) === 'dotabod_test'
      if (account && !isDotabod) {
        if (!user.youtube && account.provider === 'google') {
          // save their broadcast id for youtube live
          fetchLiveChatId(account.access_token, account.refresh_token)
            .then(async (liveChatId) => {
              if (liveChatId) {
                console.log('Live Chat ID:', liveChatId)
                await prisma.user.update({
                  where: {
                    id: user.id,
                  },
                  data: {
                    youtube: liveChatId,
                  },
                })
              } else {
                console.log('No active live broadcasts found.')
              }
            })
            .catch((error) => {
              console.error('Error fetching Live Chat ID:', error)
            })
        }

        // Refresh jwt account with potentially new scopes
        const newData = {
          refresh_token: account.refresh_token,
          access_token: account.access_token,
          expires_at: account.expires_at,
          scope: account.scope,

          // Set requires_refresh to false if the user is logging in
          // Because this new token will be the fresh one we needed
          requires_refresh: false,
        }

        await prisma.account.update({
          where: {
            provider_providerAccountId: {
              provider: account.provider,
              providerAccountId: account.providerAccountId,
            },
          },
          data: newData,
        })
      }

      const twitchId = Number(
        provider.accounts.find((p) => p.provider === 'twitch')
          ?.providerAccountId,
      )

      return {
        locale: provider.locale,
        twitchId,
        id: user.id,
        name: newUser.displayName || newUser.name,
        email: newUser.email,
        picture: newUser.image,
      }
    },
  },
}
