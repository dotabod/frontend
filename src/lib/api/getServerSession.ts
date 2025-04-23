import type { NextApiRequest, NextApiResponse } from 'next'
import { type AuthOptions, type Session, getServerSession as getNextServerSession } from 'next-auth'
import { decode } from 'next-auth/jwt'
import { LRUCache } from 'lru-cache'

// Create a session cache to avoid repeated JWT decoding and DB calls
export const sessionCache = new LRUCache<string, any>({
  max: 500, // Store up to 500 sessions
  ttl: 1000 * 60 * 5, // Cache for 5 minutes
})

export const getServerSession = async (...args: [NextApiRequest, NextApiResponse, AuthOptions]) => {
  // Create a cache key based on cookies
  const [req] = args
  const cacheKey = `session:${req.headers.cookie || ''}`
  
  // Check if we have a cached session
  const cachedSession = sessionCache.get(cacheKey)
  if (cachedSession) {
    return cachedSession
  }
  
  const session: Session | null = await getNextServerSession(...args)
  if (!session) {
    // Cache null results too to avoid unnecessary lookups
    sessionCache.set(cacheKey, null)
    return null
  }

  if (!process.env.NEXTAUTH_SECRET) {
    throw new Error('NEXTAUTH_SECRET is not set')
  }

  let authenticatedUserId: string | null = session?.user?.id
  if (session?.user?.isImpersonating) {
    const decryptedId = await decode({
      token: session?.user?.id,
      secret: process.env.NEXTAUTH_SECRET,
    })
    authenticatedUserId = decryptedId?.id ?? null
  }

  if (!authenticatedUserId) {
    sessionCache.set(cacheKey, null)
    return null
  }

  const enhancedSession = {
    ...session,
    user: { ...session.user, id: authenticatedUserId },
  }
  
  // Cache the result
  sessionCache.set(cacheKey, enhancedSession)
  
  return enhancedSession
}
