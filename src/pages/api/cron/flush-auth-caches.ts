import { NextApiRequest, NextApiResponse } from 'next'

// This API route will be called by a Vercel cron job to flush the auth caches
// This ensures that auth state doesn't get stale for too long

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Verify the request is from Vercel Cron
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  try {
    // Note: We need to dynamically import these modules to access their cache variables
    // This avoids circular dependencies
    
    // Invalidate auth caches
    const { sessionCache } = await import('@/lib/api/getServerSession')
    const { authCache } = await import('@/lib/api-middlewares/with-authentication')
    const { subscriptionCache } = await import('@/utils/subscription')
    
    // Reset all caches
    sessionCache.clear()
    authCache.clear()
    subscriptionCache.clear()
    
    console.log('Successfully flushed auth caches')
    
    return res.status(200).json({ success: true, message: 'Auth caches flushed successfully' })
  } catch (error) {
    console.error('Error flushing auth caches:', error)
    return res.status(500).json({ error: 'Failed to flush auth caches' })
  }
}