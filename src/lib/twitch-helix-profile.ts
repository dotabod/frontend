// Build the User shape NextAuth persists on first sign-in for a Twitch
// account. The OIDC profile alone is not enough:
//
//   Twitch's `preferred_username` claim is the *display* name (e.g.
//   "TECHLEED", may be Unicode/kanji), NOT the lowercase login that chat and
//   /helix endpoints expect (e.g. "techleed"). NextAuth's default
//   TwitchProvider.profile() blindly maps `preferred_username → user.name`,
//   so the row gets inserted with the wrong `name` and a NULL `displayName`.
//   The backend's twitch-events watcher then has to call /helix/users itself
//   to fix things up, with a visible window of bad data in between.
//
// This helper hits /helix/users with the just-obtained access token and
// returns `name = login` + `displayName = display_name`. If Helix is down or
// returns an unexpected shape, we fall back to deriving both from
// preferred_username so signin never blocks on this — the backend will still
// reconcile on the INSERT:accounts realtime event.

import { addBreadcrumb } from '@sentry/nextjs'

interface OidcProfile {
  sub?: string
  preferred_username?: string
  email?: string
  picture?: string
}

interface HelixUser {
  id: string
  login: string
  display_name: string
}

export interface TwitchProfileUser {
  id: string
  name: string
  displayName: string
  email?: string
  image?: string
}

const noteFallback = function noteFallback(reason: string, extra?: Record<string, unknown>) {
  addBreadcrumb({
    category: 'auth',
    data: { reason, ...extra },
    message: 'twitchHelixProfile fallback',
  })
}

const fetchHelixUser = async function fetchHelixUser(
  accessToken: string,
): Promise<HelixUser | null> {
  try {
    const res = await fetch('https://api.twitch.tv/helix/users', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Client-Id': process.env.TWITCH_CLIENT_ID ?? '',
      },
    })
    if (!res.ok) {
      noteFallback('helix_non_ok', { status: res.status })
      return null
    }
    const body = (await res.json()) as { data?: HelixUser[] }
    const user = body.data?.[0]
    if (!user) {
      noteFallback('helix_empty_data')
      return null
    }
    return user
  } catch (error) {
    noteFallback('fetch_throw', {
      error: error instanceof Error ? error.message : String(error),
    })
    return null
  }
}

export const twitchHelixProfile = async function twitchHelixProfile(
  profile: OidcProfile,
  accessToken: string,
): Promise<TwitchProfileUser> {
  const helix = await fetchHelixUser(accessToken)
  const preferred = profile.preferred_username ?? ''
  return {
    displayName: helix?.display_name ?? preferred,
    email: profile.email,
    id: profile.sub ?? helix?.id ?? '',
    image: profile.picture,
    name: helix?.login ?? preferred.toLowerCase(),
  }
}
