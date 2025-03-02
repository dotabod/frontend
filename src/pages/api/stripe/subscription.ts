import { getServerSession } from '@/lib/api/getServerSession'
import { authOptions } from '@/lib/auth'
import { SUBSCRIPTION_TIERS, getSubscription } from '@/utils/subscription'
import type { SubscriptionTier } from '@prisma/client'
import type { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
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
    if (!subscription) {
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
