import TwitchProvider from 'next-auth/providers/twitch'
import { NextAuthOptions } from 'next-auth'
import { PrismaAdapter } from '@next-auth/prisma-adapter'

import prisma from '@/lib/db'

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
      clientId: process.env.TWITCH_CLIENT_ID,
      clientSecret: process.env.TWITCH_CLIENT_SECRET,
      authorization: {
        params: {
          scope:
            'openid user:read:email channel:manage:predictions channel:manage:polls channel:read:predictions channel:read:polls',
        },
      },
    }),
  ],
  callbacks: {
    async session({ token, session }) {
      if (token) {
        session.user.id = token.id
        session.user.name = token.name
        session.user.email = token.email
        session.user.image = token.picture
      }

      return session
    },
    async jwt({ token, account, user, profile }) {
      // Save a db lookup
      if (token.id) return token

      if (!user) {
        token.id = token.sub
        return token
      }

      const newUser = {
        email: profile.email || user.email,
        // @ts-ignore from twitch?
        name: profile?.preferred_username || user.name,
        // @ts-ignore from twitch?
        image: profile?.picture || user.image,
      }

      // Refresh jwt account with potentially new scopes
      if (account) {
        await prisma.account.update({
          where: {
            provider_providerAccountId: {
              provider: account.provider,
              providerAccountId: account.providerAccountId,
            },
          },
          data: {
            user: {
              update: newUser,
            },
            // @ts-ignore from twitch?
            refresh_token: account.refresh_token,
            // @ts-ignore from twitch?
            access_token: account.access_token,
            // @ts-ignore from twitch?
            expires_at: account.expires_at,
            // @ts-ignore from twitch?
            scope: account.scope,
          },
        })
      }

      return {
        id: user.id,
        name: newUser.name,
        email: newUser.email,
        picture: newUser.image,
      }
    },
  },
}
