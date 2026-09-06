import { captureException } from '@sentry/nextjs'
import type { NextApiRequest, NextApiResponse } from 'next'

import { withAuthentication } from '@/lib/api-middlewares/with-authentication'
import { withMethods } from '@/lib/api-middlewares/with-methods'
import { getServerSession } from '@/lib/api/get-server-session'
import { authOptions } from '@/lib/auth'
import { getTwitchTokens } from '@/lib/get-twitch-tokens'

class HelixStatusError extends Error {
  constructor(public status: number) {
    super(`Twitch moderators check failed: ${status}`)
  }
}

// In-memory TTL cache so multiple dashboard tabs / rapid polling don't multiply Twitch
// Helix traffic. Per-pod cache; fine as a soft rate-limiter. 60s in either state keeps
// The dashboard responsive to real mod / unmod events without hammering helix.
const CACHE_TTL_MS = 60 * 1000
const cache = new Map<string, { modded: boolean; expiresAt: number }>()

const isModerator = async function isModerator(
  broadcasterId: string,
  accessToken: string,
): Promise<boolean> {
  const botProviderId = process.env.TWITCH_BOT_PROVIDERID
  if (!botProviderId) {
    throw new Error('TWITCH_BOT_PROVIDERID is not set')
  }

  const url = `https://api.twitch.tv/helix/moderation/moderators?broadcaster_id=${broadcasterId}&user_id=${botProviderId}`
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Client-Id': process.env.TWITCH_CLIENT_ID ?? '',
    },
    method: 'GET',
  })

  if (!response.ok) {
    throw new HelixStatusError(response.status)
  }
  const body = (await response.json()) as { data?: unknown[] }
  return Array.isArray(body.data) && body.data.length > 0
}

const handler = async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions)
  if (!session?.user?.id) {
    res.status(401).json({ message: 'Unauthorized' })
    return
  }

  const userId = session.user.id
  const cached = cache.get(userId)
  if (cached && cached.expiresAt > Date.now()) {
    res.status(200).json({ modded: cached.modded })
    return
  }

  try {
    const { providerAccountId, accessToken, error } = await getTwitchTokens(userId)
    if (error || !providerAccountId || !accessToken) {
      res.status(200).json({ modded: false, reason: 'no_twitch_token' })
      return
    }
    const modded = await isModerator(providerAccountId, accessToken)
    cache.set(userId, { expiresAt: Date.now() + CACHE_TTL_MS, modded })
    res.status(200).json({ modded })
    return
  } catch (error) {
    // 401/403/404 from helix are expected user states (no scopes, deleted broadcaster) —
    // Log to Sentry only for unexpected failures so we keep the signal high.
    if (!(error instanceof HelixStatusError)) {
      captureException(error)
    }
    res.status(200).json({ modded: false, reason: 'check_failed' })
    return
  }
}

export default withMethods(['GET'], withAuthentication(handler))
