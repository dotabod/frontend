import TwitchProvider from 'next-auth/providers/twitch'
import { NextAuthOptions } from 'next-auth'
import { PrismaAdapter } from '@next-auth/prisma-adapter'

import prisma from '@/lib/db'

const useBotScopes = false

// Do not delete this declaration
const chatBotScopes = [
  'channel:moderate',
  'chat:edit',
  'chat:read',
  'whispers:read',
  'whispers:edit',
  'user:manage:whispers',
  'moderator:manage:chat_messages',
].join(' ')

const defaultScopes = [
  'openid',
  'user:read:email',
  'channel:manage:predictions',
  'channel:manage:polls',
  'channel:read:predictions',
  'channel:read:polls',
  'chat:read',
  'chat:edit',
  'user:read:chat',
  'user:write:chat',
  'moderator:manage:chat_messages',
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
    TwitchProvider({
      allowDangerousEmailAccountLinking: true,
      clientId: process.env.TWITCH_CLIENT_ID,
      clientSecret: process.env.TWITCH_CLIENT_SECRET,
      authorization: {
        params: {
          scope: useBotScopes
            ? `${defaultScopes} ${chatBotScopes}`
            : defaultScopes,
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
          Account: {
            select: {
              requires_refresh: true,
              providerAccountId: true,
            },
          },
          locale: true,
        },
      })

      const twitchId = Number(provider.Account.providerAccountId)
      const isBotUser = twitchId === Number(process.env.TWITCH_BOT_PROVIDERID)
      const shouldRefresh =
        account &&
        ((!useBotScopes && !isBotUser) || (useBotScopes && isBotUser))

      if (shouldRefresh) {
        // Set requires_refresh to false if the user is logging in
        // Because this new token will be the fresh one we needed

        await prisma.account.update({
          where: {
            provider_providerAccountId: {
              provider: account.provider,
              providerAccountId: account.providerAccountId,
            },
          },
          data: {
            refresh_token: account.refresh_token,
            access_token: account.access_token,
            expires_at: account.expires_at,
            scope: account.scope,
            requires_refresh: false,
          },
        })
      }

      return {
        locale: provider.locale,
        twitchId: twitchId,
        id: user.id,
        name: newUser.displayName || newUser.name,
        email: newUser.email,
        picture: newUser.image,
      }
    },
  },
}
