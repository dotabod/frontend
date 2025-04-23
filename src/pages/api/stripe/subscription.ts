import { getServerSession } from '@/lib/api/getServerSession'
import { authOptions } from '@/lib/auth'
import { SUBSCRIPTION_TIERS, getSubscription, isSubscriptionActive } from '@/utils/subscription'
import type { SubscriptionTier } from '@prisma/client'
import type { NextApiRequest, NextApiResponse } from 'next'
import { withMethods } from '@/lib/api-middlewares/with-methods'

async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Add cache headers to reduce function invocations
  res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=300')
  
  try {
    const session = await getServerSession(req, res, authOptions)

    // Prevent impersonation
    if (session?.user?.isImpersonating) {
      return res.status(403).json({ message: 'Unauthorized' })
    }

    // Get the effective user ID
    const userId = req.query.id as string | undefined
    const userIdToUse = userId || session?.user?.id

    // Check for authentication
    if (!userIdToUse) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const subscription = await getSubscription(userIdToUse)

    // Return free tier if no subscription or subscription is not active
    if (!subscription || !isSubscriptionActive(subscription)) {
      return res.status(200).json({
        tier: SUBSCRIPTION_TIERS.FREE,
        status: null,
        stripePriceId: '',
      })
    }

    return res.status(200).json({
      ...subscription,
      tier: subscription.tier as SubscriptionTier,
    })
  } catch (error) {
    console.error('Error in subscription route:', error)
    return res.status(500).json({ error: 'Internal Server Error' })
  }
}

export default withMethods(['GET'], handler)
