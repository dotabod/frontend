import { PrismaAdapter } from '@next-auth/prisma-adapter'
import { captureException } from '@sentry/nextjs'
import type { NextAuthOptions } from 'next-auth'
import { decode, encode, type JWT } from 'next-auth/jwt'
import CredentialsProvider from 'next-auth/providers/credentials'
import TwitchProvider from 'next-auth/providers/twitch'
import prisma from '@/lib/db'
import { getTwitchTokens } from '@/lib/getTwitchTokens'
import { getModeratedChannels } from '@/pages/api/get-moderated-channels'
import type { TwitchProfile, TwitchUser } from '@/types/twitch'
import { chatBotScopes, chatVerifyScopes, defaultScopes } from './authScopes'

const extractCookieValue = (cookieHeader: string | string[] | undefined, name: string) => {
  if (!cookieHeader) return ''

  const cookieStringFull = Array.isArray(cookieHeader)
    ? cookieHeader.find((header) => header.includes(name))
    : cookieHeader

  if (!cookieStringFull) return ''

  const match = cookieStringFull
    .split(';')
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${name}=`))

  return match ?? ''
}

if (!process.env.TWITCH_CLIENT_ID || !process.env.TWITCH_CLIENT_SECRET) {
  throw new Error('TWITCH_CLIENT_ID or TWITCH_CLIENT_SECRET is not set')
}
if (!process.env.NEXTAUTH_SECRET) {
  throw new Error('NEXTAUTH_SECRET is not set')
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: 'jwt',
    maxAge: 3 * 24 * 60 * 60, // 3 days in seconds
  },
  pages: {
    signIn: '/login',
    error: '/error',
  },
  events: {
    async signIn({ user }) {
      if (user.id) {
        try {
          fetch(`${process.env.NEXT_PUBLIC_GSI_WEBSOCKET_URL}/resubscribe`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ token: user.id }),
          }).catch((error) => {
            console.error('Error calling resubscribe endpoint:', error)
            captureException(error, {
              extra: {
                userId: user.id,
              },
            })
          })
        } catch (error) {
          console.error('Error calling resubscribe endpoint:', error)
          captureException(error, {
            extra: {
              userId: user.id,
            },
          })
        }
      }
    },
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
        const channelToImpersonate = Number.parseInt(credentials?.channelToImpersonate ?? '0')
        if (!channelToImpersonate) {
          captureException(new Error('Invalid channel ID'))
          throw new Error('ACCESS_DENIED')
        }

        const headerCookies = req.headers?.cookie
        let currentLoggedInUserId: string | undefined
        let currentProviderId: string | undefined

        try {
          const secureCookie =
            process.env.NEXTAUTH_URL?.startsWith('https://') ?? !!process.env.VERCEL
          const cookieName = secureCookie
            ? '__Secure-next-auth.session-token'
            : 'next-auth.session-token'
          const sessionToken = extractCookieValue(headerCookies, cookieName)
          const actualToken = await decode({
            secret: process.env.NEXTAUTH_SECRET ?? '',
            token: sessionToken.replace(`${cookieName}=`, ''),
          })
          currentLoggedInUserId = actualToken?.id ?? undefined
          currentProviderId = actualToken?.twitchId ?? undefined
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

        const { providerAccountId, accessToken, error } =
          await getTwitchTokens(currentLoggedInUserId)
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
          const response = await getModeratedChannels(providerAccountId, accessToken)

          if (
            Array.isArray(response) &&
            !response.find(
              (channel) => Number.parseInt(channel.providerAccountId, 10) === channelToImpersonate,
            )
          ) {
            captureException(new Error('You are not a moderator for this channel'), {
              extra: {
                userId: currentLoggedInUserId,
                channelToImpersonate,
              },
            })
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
              moderatorChannelId: Number.parseInt(currentProviderId ?? '0', 10),
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
          scope: defaultScopes,
        },
      },
    }),
  ],
  callbacks: {
    async session({ token, session, ...rest }) {
      if (token) {
        const encryptedId = await encode({
          token: {
            image: token.picture ?? token.image ?? '',
            name: '',
            id: token.id,
            isImpersonating: token.isImpersonating,
            twitchId: '',
            locale: '',
            scope: '',
          },
          secret: process.env.NEXTAUTH_SECRET ?? '',
        })
        session.user.isImpersonating = token.isImpersonating
        session.user.locale = token.locale
        session.user.twitchId = token.twitchId
        session.user.role = token.role
        session.user.id = token?.isImpersonating ? encryptedId : token.id
        session.user.name = token.name
        session.user.email = token?.isImpersonating ? '' : token.email
        session.user.image = token.picture ?? token.image ?? ''
        session.user.scope = token.scope
      }

      return session
    },
    async jwt({ token, account, user, profile }) {
      // Save a db lookup
      if (token.id) return token

      if (!user) {
        if (!token.sub) {
          throw new Error('User ID is required')
        }
        token.id = token.sub
        return token
      }

      const twitchProfile = profile as TwitchProfile | undefined
      const twitchUser = user as TwitchUser

      const newUser = {
        email: twitchProfile?.email ?? twitchUser.email,
        name: twitchProfile?.preferred_username ?? twitchUser.name ?? twitchUser.displayName ?? '',
        displayName:
          twitchProfile?.preferred_username ??
          twitchUser.displayName ??
          token.name ??
          twitchUser.name ??
          '',
        image: twitchProfile?.picture ?? twitchUser.image,
      }

      const provider = await prisma.user.findFirst({
        where: {
          id: token.id || user.id || profile?.sub,
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
              scope: true,
              requires_refresh: true,
              providerAccountId: true,
            },
          },
          locale: true,
        },
      })
      const isImpersonating = account?.provider === 'impersonate'

      // Check if user is logging in as a chatter by comparing scopes
      const isLoggingInAsChatter = account?.scope
        ? account.scope.split(' ').length === chatVerifyScopes.split(' ').length &&
          account.scope.split(' ').every((scope) => chatVerifyScopes.split(' ').includes(scope))
        : false

      // Check if user is logging in as a bot by comparing scopes
      const isLoggingInAsBot = account?.scope
        ? account.scope.split(' ').length === chatBotScopes.split(' ').length &&
          account.scope.split(' ').every((scope) => chatBotScopes.split(' ').includes(scope))
        : false

      const isLoggingInAsStreamer = account?.scope
        ? account.scope.split(' ').length === defaultScopes.split(' ').length &&
          account.scope.split(' ').every((scope) => defaultScopes.split(' ').includes(scope))
        : false

      const alreadyHasStreamerScopes =
        provider?.Account?.scope &&
        provider.Account.scope.split(' ').length > chatVerifyScopes.split(' ').length &&
        provider.Account.requires_refresh === false

      const getRoleFromScopes = (): 'bot' | 'user' | 'chatter' | 'admin' => {
        if (provider?.admin?.role) {
          return provider.admin.role as 'admin'
        }

        if (isLoggingInAsBot) {
          return 'bot'
        }

        // even if they login as chatter, since they have streamer scopes, we should treat them as a user
        if (alreadyHasStreamerScopes) {
          return 'user'
        }

        if (isLoggingInAsStreamer) {
          return 'user'
        }

        if (isLoggingInAsChatter) {
          return 'chatter'
        }

        return 'user'
      }

      const roleFromScopes = getRoleFromScopes()

      const scopesToUpdate =
        roleFromScopes === 'chatter'
          ? chatVerifyScopes
          : roleFromScopes === 'bot'
            ? chatBotScopes
            : alreadyHasStreamerScopes && isLoggingInAsChatter
              ? // use old scopes
                (provider?.Account?.scope ?? defaultScopes)
              : // use new scopes
                (account?.scope ?? defaultScopes)

      // Name change case. This case is further handled in the webhook utils for `twitch-events`
      if (
        !isImpersonating &&
        provider?.displayName &&
        provider.displayName !== newUser.displayName
      ) {
        await prisma.user.update({
          where: {
            id: user.id,
          },
          data: {
            updatedAt: new Date(),
            displayName: newUser.displayName,
          },
        })
      }

      const twitchId = Number(provider?.Account?.providerAccountId ?? '0')
      if (!twitchId) {
        throw new Error('Twitch ID is required')
      }

      let shouldRefresh = false
      if (account) {
        shouldRefresh = true

        if (isLoggingInAsChatter && alreadyHasStreamerScopes) {
          shouldRefresh = false
        }

        if (isImpersonating) {
          shouldRefresh = false
        }
      }

      if (shouldRefresh && account) {
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
            updatedAt: new Date(),
            refresh_token: account.refresh_token,
            access_token: account.access_token,
            expires_at: account.expires_at,
            scope: account.scope,
            requires_refresh: false,
          },
        })
      }

      const result = {
        locale: provider?.locale,
        twitchId: String(twitchId),
        id: user.id,
        name: newUser.displayName || newUser.name,
        email: newUser.email,
        image: newUser.image || '',
        isImpersonating,
        role: roleFromScopes,
        scope: scopesToUpdate,
      }

      return result as JWT
    },
  },
}
