import { PrismaAdapter } from '@next-auth/prisma-adapter'
import { captureException, captureMessage } from '@sentry/nextjs'
import type { NextAuthOptions } from 'next-auth'
import { decode, encode, type JWT } from 'next-auth/jwt'
import CredentialsProvider from 'next-auth/providers/credentials'
import TwitchProvider from 'next-auth/providers/twitch'
import prisma from '@/lib/db'
import { getTwitchTokens } from '@/lib/getTwitchTokens'
import { reconcileTwitchProfile } from '@/lib/reconcileTwitchProfile'
import { twitchHelixProfile } from '@/lib/twitchHelixProfile'
import { getModeratedChannels } from '@/pages/api/get-moderated-channels'
import type { TwitchProfile, TwitchUser } from '@/types/twitch'
import { chatBotScopes, chatVerifyScopes, defaultScopes } from './authScopes'

const extractCookieValue = (cookieHeader: string | string[] | undefined, name: string) => {
  if (!cookieHeader) {
    return ''
  }

  const cookieStringFull = Array.isArray(cookieHeader)
    ? cookieHeader.find((header) => header.includes(name))
    : cookieHeader

  if (!cookieStringFull) {
    return ''
  }

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

// Closed sets bound the fingerprint cardinality on captured events. The
// `/api/auth/_log` endpoint forwards `code` from `req.body`, so an unbounded
// fingerprint would let any client create unbounded Sentry issues.
const KNOWN_NEXTAUTH_ERROR_CODES = new Set([
  'OAUTH_CALLBACK_ERROR',
  'OAUTH_CALLBACK_HANDLER_ERROR',
  'OAUTH_V1_GET_ACCESS_TOKEN_ERROR',
  'OAUTH_PARSE_PROFILE_ERROR',
  'SIGNIN_OAUTH_ERROR',
  'CALLBACK_OAUTH_ERROR',
  'SIGNIN_EMAIL_ERROR',
  'CALLBACK_EMAIL_ERROR',
  'SIGNIN_CREDENTIALS_ERROR',
  'CALLBACK_CREDENTIALS_JWT_ERROR',
  'SESSION_ERROR',
  'JWT_SESSION_ERROR',
  'SIGNOUT_ERROR',
  'LOGGER_ERROR',
  'EVENTS_ERROR',
  'ADAPTER_ERROR_CREATE_USER',
  'ADAPTER_ERROR_GET_USER_BY_EMAIL',
  'ADAPTER_ERROR_GET_USER_BY_ACCOUNT',
  'ADAPTER_ERROR_UPDATE_USER',
  'ADAPTER_ERROR_LINK_ACCOUNT',
  'ADAPTER_ERROR_CREATE_SESSION',
  'ADAPTER_ERROR_GET_SESSION_AND_USER',
  'ADAPTER_ERROR_UPDATE_SESSION',
  'ADAPTER_ERROR_DELETE_SESSION',
  'ADAPTER_ERROR_USE_VERIFICATION_TOKEN',
])
const KNOWN_NEXTAUTH_WARN_CODES = new Set([
  'JWT_AUTO_GENERATED_SIGNING_KEY',
  'NEXTAUTH_URL',
  'EMAIL_FROM',
  'EXPERIMENTAL_API',
  'DEBUG_ENABLED',
])

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  callbacks: {
    async jwt({ token, account, user, profile }) {
      // Save a db lookup
      if (token.id) {
        return token
      }

      if (!user) {
        if (!token.sub) {
          throw new Error('User ID is required')
        }
        token.id = token.sub
        return token
      }

      const twitchProfile = profile as TwitchProfile | undefined
      const twitchUser = user as TwitchUser

      // displayName MUST prefer the fresh OIDC `preferred_username` over
      // `twitchUser.displayName` — on returning sign-ins, `twitchUser` is the
      // existing DB row (set by NextAuth from getUserByAccount), so using it
      // first would mask a Twitch-side rename. `preferred_username` is always
      // the current rendered display name from this sign-in's id_token.
      //
      // `name` is the inverse: `preferred_username` is the *display* name
      // (uppercase/Unicode), not the lowercase login chat/Helix require. On
      // NEW sign-ins the TwitchProvider.profile() override fills
      // `twitchUser.name` with the Helix `login`. On RETURNING sign-ins it's
      // the (potentially stale) DB value — when displayName change is
      // detected below, the prisma.user.update triggers the backend's
      // UPDATE:users watcher, which calls /helix/users itself and reconciles
      // both fields.
      const newUser = {
        displayName:
          twitchProfile?.preferred_username ?? twitchUser.displayName ?? token.name ?? '',
        email: twitchProfile?.email ?? twitchUser.email,
        image: twitchProfile?.picture ?? twitchUser.image,
        name: twitchUser.name ?? twitchProfile?.preferred_username?.toLowerCase() ?? '',
      }

      const provider = await prisma.user.findFirst({
        select: {
          Account: {
            select: {
              providerAccountId: true,
              requires_refresh: true,
              scope: true,
            },
          },
          admin: {
            select: {
              role: true,
            },
          },
          bannedAt: true,
          displayName: true,
          locale: true,
        },
        where: {
          id: token.id || user.id || profile?.sub,
        },
      })

      // Hard gate: a banned user cannot acquire a JWT. NextAuth surfaces a
      // thrown error to /error?error=<message>; the error page maps
      // ACCOUNT_BANNED to a "you're banned, contact support" copy.
      if (provider?.bannedAt) {
        throw new Error('ACCOUNT_BANNED')
      }

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

        // Even if they login as chatter, since they have streamer scopes, we should treat them as a user
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
              ? // Use old scopes
                (provider?.Account?.scope ?? defaultScopes)
              : // Use new scopes
                (account?.scope ?? defaultScopes)

      // Name change case. This case is further handled in the webhook utils for `twitch-events`
      if (
        !isImpersonating &&
        provider?.displayName &&
        provider.displayName !== newUser.displayName
      ) {
        await prisma.user.update({
          data: {
            displayName: newUser.displayName,
            updatedAt: new Date(),
          },
          where: {
            id: user.id,
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
          data: {
            access_token: account.access_token,
            expires_at: account.expires_at,
            refresh_token: account.refresh_token,
            requires_refresh: false,
            scope: account.scope,
            updatedAt: new Date(),
          },
          where: {
            provider_providerAccountId: {
              provider: account.provider,
              providerAccountId: account.providerAccountId,
            },
          },
        })
      }

      const result = {
        email: newUser.email,
        id: user.id,
        image: newUser.image || '',
        isImpersonating,
        locale: provider?.locale,
        name: newUser.displayName || newUser.name,
        role: roleFromScopes,
        scope: scopesToUpdate,
        twitchId: String(twitchId),
      }

      return result as JWT
    },
    async session({ token, session }) {
      if (token) {
        const encryptedId = await encode({
          secret: process.env.NEXTAUTH_SECRET ?? '',
          token: {
            id: token.id,
            image: token.picture ?? token.image ?? '',
            isImpersonating: token.isImpersonating,
            locale: '',
            name: '',
            scope: '',
            twitchId: '',
          },
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
  },
  events: {
    // Reconcile users.name + users.displayName against /helix/users on every
    // sign-in. Covers the edge case the jwt() rename check misses: a user
    // changing their Twitch login WITHOUT changing display name (OIDC's
    // preferred_username = display name, so a login-only rename is invisible
    // to the callback). Fire-and-forget — failures get logged + Sentry'd,
    // but never block sign-in.
    //
    // (The previous events.signIn POST to /resubscribe is gone — the jwt()
    // callback's `accounts.requires_refresh = false` write already triggers
    // the backend twitch-events watcher when the value transitions from
    // true, and the 5-min runSubscriptionHealthCheck reconciles missing
    // subs for the no-transition edge case.)
    signIn({ user, account }) {
      if (!user.id || !account || account.provider !== 'twitch' || !account.access_token) return
      const userId = user.id
      reconcileTwitchProfile({ prisma, userId, accessToken: account.access_token }).catch(
        (error) => {
          console.error('Error reconciling twitch profile:', error)
          captureException(error, { extra: { userId } })
        },
      )
    },
  },
  // Forward NextAuth's internal logger to Sentry so the root cause of an
  // OAuthCallback (token-exchange status, profile-fetch response, state-cookie
  // mismatch, etc.) is captured server-side. Without this, the only signal we
  // get is the bare `?error=OAuthCallback` redirect on the login page. We
  // still mirror to console so Vercel function logs keep their familiar
  // `[next-auth]` markers for grep-based triage.
  logger: {
    error(code, metadata) {
      // `code` is typed string by NextAuth, but the `/api/auth/_log` POST path
      // unpacks it from `req.body` so a crafted client can send a non-string.
      if (typeof code !== 'string') return
      // `CLIENT_*` codes come from the browser via /api/auth/_log when
      // next-auth/react's fetch to /api/auth/session blips (ad-blockers, tab
      // closed mid-request, mobile network). They drown out actionable
      // server-side codes like OAUTH_CALLBACK_ERROR.
      if (code.startsWith('CLIENT_')) return
      console.error(`[next-auth][error][${code}]`, metadata)
      const maybeError =
        metadata instanceof Error ? metadata : (metadata as { error?: unknown } | undefined)?.error
      const error = maybeError instanceof Error ? maybeError : new Error(code)
      const known = KNOWN_NEXTAUTH_ERROR_CODES.has(code) ? code : 'unknown'
      captureException(error, {
        // Explicit fingerprint by code, otherwise the `new Error(code)`
        // fallback path collapses every distinct code into one issue
        // (same stacktrace top-frame) — defeats the whole point.
        fingerprint: ['next-auth-error', known],
        tags: {
          source: 'next-auth',
          code: known === 'unknown' ? code.slice(0, 60) : code,
        },
        extra: metadata instanceof Error ? undefined : (metadata as Record<string, unknown>),
      })
    },
    warn(code) {
      if (typeof code !== 'string') return
      console.warn(`[next-auth][warn][${code}]`)
      const known = KNOWN_NEXTAUTH_WARN_CODES.has(code) ? code : 'unknown'
      captureMessage('next-auth warning', {
        level: 'warning',
        fingerprint: ['next-auth-warn', known],
        tags: {
          source: 'next-auth',
          code: known === 'unknown' ? code.slice(0, 60) : code,
        },
      })
    },
    debug() {},
  },
  pages: {
    error: '/error',
    signIn: '/login',
  },
  providers: [
    CredentialsProvider({
      async authorize(credentials, req) {
        const channelToImpersonate = Number.parseInt(credentials?.channelToImpersonate ?? '0', 10)
        if (!channelToImpersonate) {
          captureException(new Error('Invalid channel ID'))
          throw new Error('ACCESS_DENIED')
        }

        const headerCookies = req.headers?.cookie
        let currentLoggedInUserId: string | undefined
        let currentProviderId: string | undefined

        try {
          const secureCookie =
            process.env.NEXTAUTH_URL?.startsWith('https://') ?? Boolean(process.env.VERCEL)
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
        } catch (error) {
          console.error(error)
          captureException(error, {
            extra: {
              channelToImpersonate: credentials?.channelToImpersonate,
              userId: currentLoggedInUserId,
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
            admin: {
              role: 'admin',
            },
            id: currentLoggedInUserId,
          },
        })

        if (!isAdmin) {
          // Check to make sure they're still a moderator on twitch
          const response = await getModeratedChannels(providerAccountId, accessToken)

          if (
            Array.isArray(response) &&
            !response.find(
              (channel) => Number.parseInt(channel.providerAccountId, 10) === channelToImpersonate,
            )
          ) {
            captureException(new Error('You are not a moderator for this channel'), {
              extra: {
                channelToImpersonate,
                userId: currentLoggedInUserId,
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
              channelToImpersonate,
              userId: currentLoggedInUserId,
            },
          })
          throw new Error('ACCESS_DENIED')
        }

        if (!isAdmin) {
          // Check to make sure they're an approved moderator for this user
          const moderator = await prisma.approvedModerator.findFirst({
            select: {
              createdAt: true,
              moderatorChannelId: true,
            },
            where: {
              moderatorChannelId: Number.parseInt(currentProviderId ?? '0', 10),
              userId: userToImpersonate.userId,
            },
          })

          if (!moderator) {
            captureException(new Error('NOT_APPROVED'), {
              extra: {
                channelToImpersonate,
                userId: currentLoggedInUserId,
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
              channelToImpersonate,
              userId: currentLoggedInUserId,
            },
          })
          throw new Error('ACCESS_DENIED')
        }

        return { ...data?.user, currentLoggedInUserId }
      },
      credentials: {
        channelToImpersonate: {
          label: 'Channel ID',
          placeholder: '1234',
          type: 'text',
        },
      },
      id: 'impersonate',
      name: 'impersonate',
    }),
    TwitchProvider({
      allowDangerousEmailAccountLinking: true,
      authorization: {
        params: {
          scope: defaultScopes,
        },
      },
      clientId: process.env.TWITCH_CLIENT_ID,
      clientSecret: process.env.TWITCH_CLIENT_SECRET,
      // Twitch OIDC's `preferred_username` is the *display* name (uppercase,
      // may be Unicode). The lowercase login that chat/Helix require is only
      // available via /helix/users. Fetching it here means the User row is
      // created with the correct `name` and `displayName` from the first
      // INSERT — eliminating the window where the backend's twitch-events
      // watcher had to retroactively fix the row.
      async profile(profile, tokens) {
        return twitchHelixProfile(profile, tokens.access_token ?? '')
      },
    }),
  ],
  session: {
    maxAge: 3 * 24 * 60 * 60, // 3 days in seconds
    strategy: 'jwt',
  },
}
