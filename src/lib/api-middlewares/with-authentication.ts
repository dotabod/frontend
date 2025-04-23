import { getServerSession } from '@/lib/api/getServerSession'
import type { NextApiHandler, NextApiRequest, NextApiResponse } from 'next'

import { authOptions } from '@/lib/auth'
import * as Sentry from '@sentry/nextjs'
import { LRUCache } from 'lru-cache'

// Create an in-memory cache for session/auth data to reduce DB hits
// This dramatically reduces function invocations by caching auth results
export const authCache = new LRUCache<string, boolean>({
  max: 500, // Store up to 500 authentication results
  ttl: 1000 * 60 * 5, // Cache for 5 minutes
})

export function withAuthentication(handler: NextApiHandler) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    // Create a cache key based on cookies and relevant query params
    const cacheKey = `auth:${req.headers.cookie || ''}:${req.query.id || ''}:${req.query.token || ''}:${req.query.username || ''}`
    
    // Check if we have a cached result
    const cachedResult = authCache.get(cacheKey)
    
    if (cachedResult === true) {
      // Skip full auth check if we've authenticated this request pattern before
      return handler(req, res)
    }
    
    const session = await getServerSession(req, res, authOptions)
    const userId = (req.query.id as string) || session?.user?.id || (req.query.token as string)
    const username = req.query.username as string

    if (process.env.NEXT_PUBLIC_SENTRY_DSN && !!session?.user?.id) {
      Sentry.setUser({
        id: session?.user?.id,
        username: session?.user?.name,
        email: session?.user?.email ?? undefined,
        twitchId: session?.user?.twitchId,
        locale: session?.user?.locale,
        isImpersonating: session?.user?.isImpersonating,
      })
    }

    if (!userId && !username) {
      return res.status(403).json({ message: 'Unauthorized' })
    }
    
    // Cache the successful auth result
    authCache.set(cacheKey, true)

    return handler(req, res)
  }
}
