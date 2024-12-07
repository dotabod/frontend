import prisma from '@/lib/db'
import { getTwitchTokens } from '@/lib/getTwitchTokens'
import { getModeratedChannels } from '@/pages/api/get-moderated-channels'
import { PrismaAdapter } from '@next-auth/prisma-adapter'
import { captureException } from '@sentry/nextjs'
import type { NextAuthOptions } from 'next-auth'
import { decode, encode } from 'next-auth/jwt'
import CredentialsProvider from 'next-auth/providers/credentials'
import TwitchProvider from 'next-auth/providers/twitch'

// Manually toggle this when logging in as the bot if we need to update scopes
const useBotScopes = process.env.VERCEL_ENV !== 'production'

// Do not delete this declaration
const chatBotScopes = [
  'channel:moderate',
  'whispers:read',
  'user:bot',
  'whispers:edit',
  'user:manage:whispers',
  'moderator:read:chat_settings', // To check follower mode, emoji mode, etc
  'moderator:manage:chat_messages', // For the !plebs command
  'moderator:manage:chat_settings', // To update slow mode, follower mode, etc
].join(' ')

const defaultScopes = [
  'channel:bot', // Allows joining with Dotabod in the channel (new requirement by twitch)
  'channel:manage:ads', // Run ads automatically when a game ends
  'channel:manage:broadcast', // Create clips on rampage, update channel's game when playing dota, etc
  'channel:manage:moderators', // To add Dotabod as a moderator (required)
  'channel:manage:polls',
  'channel:manage:predictions',
  'channel:read:ads', // Determine if an ad is running
  'channel:read:polls',
  'channel:read:predictions',
  'channel:read:vips', // Custom commands for VIPs
  'chat:edit',
  'chat:read',
  'clips:edit', // Rampage clips, funny deaths, etc
  'moderator:read:followers', // Save total followers for the user
  'moderation:read', // Check if Dotabod is banned so we can disable it
  'openid',
  'user:read:broadcast', // We can check if twitch tooltips extension is enabled
  'user:read:chat',
  'user:read:email',
  'user:read:moderated_channels', // Check where the user is a moderator, for dotabod mod dashboard (coming soon)
  'user:write:chat',
].join(' ')

const extractCookieValue = (cookieHeader: string | string[], name: string) => {
  const cookieStringFull = Array.isArray(cookieHeader)
    ? cookieHeader.find((header) => header.includes(name))
    : cookieHeader
  return name + cookieStringFull?.split(name)[1].split(';')[0]
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: 'jwt',
  },
  pages: {
    signIn: '/login',
    error: '/error',
  },
  providers: [
    CredentialsProvider({
      name: 'impersonate',
      id: 'impersonate',
      credentials: {
        channelToImpersonate: {
          label: 'Channel ID',
          type: 'text',
          placeholder: '1234',
        },
      },

      async authorize(credentials, req) {
        const channelToImpersonate = Number.parseInt(
          credentials?.channelToImpersonate
        )
        if (!channelToImpersonate) {
          captureException(new Error('Invalid channel ID'))
          throw new Error('ACCESS_DENIED')
        }

        const headerCookies = req.headers?.cookie
        let currentLoggedInUserId: string | undefined
        let currentProviderId: string | undefined

        try {
          const secureCookie =
            process.env.NEXTAUTH_URL?.startsWith('https://') ??
            !!process.env.VERCEL
          const cookieName = secureCookie
            ? '__Secure-next-auth.session-token'
            : 'next-auth.session-token'
          const sessionToken = extractCookieValue(headerCookies, cookieName)
          const actualToken = await decode({
            secret: process.env.NEXTAUTH_SECRET,
            token: sessionToken.replace(`${cookieName}=`, ''),
          })
          currentLoggedInUserId = actualToken.id
          currentProviderId = actualToken.twitchId
        } catch (e) {
          console.error(e)
          captureException(e, {
            extra: {
              userId: currentLoggedInUserId,
              channelToImpersonate: credentials?.channelToImpersonate,
            },
          })
        }

        if (!currentLoggedInUserId) {
          captureException(new Error('Invalid session token'), {
            extra: {
              userId: currentLoggedInUserId,
            },
          })
          throw new Error('ACCESS_DENIED')
        }

        const { providerAccountId, accessToken, error } = await getTwitchTokens(
          currentLoggedInUserId
        )
        if (error) {
          throw new Error('MODERATOR_ACCESS_DENIED')
        }

        const isAdmin = await prisma.user.findFirst({
          where: {
            id: currentLoggedInUserId,
            admin: {
              role: 'admin',
            },
          },
        })

        if (!isAdmin) {
          // check to make sure they're still a moderator on twitch
          const response = await getModeratedChannels(
            providerAccountId,
            accessToken
          )

          if (
            Array.isArray(response) &&
            !response.find(
              (channel) =>
                Number.parseInt(channel.providerAccountId, 10) ===
                channelToImpersonate
            )
          ) {
            captureException(
              new Error('You are not a moderator for this channel'),
              {
                extra: {
                  userId: currentLoggedInUserId,
                  channelToImpersonate,
                },
              }
            )
            throw new Error('MODERATOR_ACCESS_DENIED')
          }
        }

        const userToImpersonate = await prisma.account.findFirst({
          select: {
            userId: true,
          },
          where: {
            providerAccountId: `${channelToImpersonate}`,
          },
        })

        if (!userToImpersonate) {
          captureException(new Error('Channel not found'), {
            extra: {
              userId: currentLoggedInUserId,
              channelToImpersonate,
            },
          })
          throw new Error('ACCESS_DENIED')
        }

        if (!isAdmin) {
          // check to make sure they're an approved moderator for this user
          const moderator = await prisma.approvedModerator.findFirst({
            select: {
              moderatorChannelId: true,
              createdAt: true,
            },
            where: {
              moderatorChannelId: Number.parseInt(currentProviderId, 10),
              userId: userToImpersonate.userId,
            },
          })

          if (!moderator) {
            captureException(new Error('NOT_APPROVED'), {
              extra: {
                userId: currentLoggedInUserId,
                channelToImpersonate,
              },
            })
            throw new Error('NOT_APPROVED')
          }
        }

        const data = await prisma.account.findUnique({
          select: {
            user: true,
          },
          where: {
            providerAccountId: `${channelToImpersonate}`,
          },
        })

        if (!data) {
          captureException(new Error('Channel not found'), {
            extra: {
              userId: currentLoggedInUserId,
              channelToImpersonate,
            },
          })
          throw new Error('ACCESS_DENIED')
        }

        return { ...data?.user, currentLoggedInUserId }
      },
    }),
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
    async session({ token, session, ...rest }) {
      if (token) {
        const encryptedId = await encode({
          token: {
            name: '',
            id: token.id,
            isImpersonating: token.isImpersonating,
            twitchId: '',
            locale: '',
            scope: '',
          },
          secret: process.env.NEXTAUTH_SECRET,
        })
        session.user.isImpersonating = token.isImpersonating
        session.user.locale = token.locale
        session.user.twitchId = token.twitchId
        session.user.role = token.role
        session.user.id = token?.isImpersonating ? encryptedId : token.id
        session.user.name = token.name
        session.user.email = token?.isImpersonating ? '' : token.email
        session.user.image = token.picture
        session.user.scope = token.scope
      }

      return session
    },
    // @ts-ignore
    async jwt({ token, account, user, profile }) {
      // Save a db lookup
      if (token.id) return token

      if (!user) {
        token.id = token.sub
        return token
      }

      const newUser = {
        email: profile?.email || user.email,
        // @ts-ignore from twitch?
        name: profile?.preferred_username || user.name || user.displayName,
        displayName:
          // @ts-ignore from twitch?
          profile?.preferred_username ||
          // @ts-ignore from twitch?
          user.displayName ||
          token.name ||
          user.name,
        // @ts-ignore from twitch?
        image: profile?.picture || user.image,
      }

      const provider = await prisma.user.findFirst({
        where: {
          id: token.id || user.id || profile.sub,
        },
        select: {
          admin: {
            select: {
              role: true,
            },
          },
          displayName: true,
          Account: {
            select: {
              requires_refresh: true,
              providerAccountId: true,
            },
          },
          locale: true,
        },
      })
      const isImpersonating = account?.provider === 'impersonate'

      // Name change case. This case is further handled in the webhook utils for `twitch-events`
      if (
        !isImpersonating &&
        provider.displayName &&
        provider.displayName !== newUser.displayName &&
        account
      ) {
        await prisma.user.update({
          where: {
            id: user.id,
          },
          data: {
            displayName: newUser.displayName,
          },
        })
      }

      const twitchId = Number(provider.Account.providerAccountId)
      const isBotUser = twitchId === Number(process.env.TWITCH_BOT_PROVIDERID)
      const shouldRefresh =
        account &&
        ((!useBotScopes && !isBotUser) || (useBotScopes && isBotUser))

      if (shouldRefresh && !isImpersonating) {
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
        isImpersonating,
        role: provider.admin?.role,
        scope: account?.scope,
      }
    },
  },
}
