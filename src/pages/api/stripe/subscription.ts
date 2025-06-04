import { getServerSession } from '@/lib/api/getServerSession'
import { authOptions } from '@/lib/auth'
import { SUBSCRIPTION_TIERS, getSubscription, isSubscriptionActive } from '@/utils/subscription'
import type { SubscriptionTier } from '@prisma/client'
import type { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await getServerSession(req, res, authOptions)

    // Check for authentication
    if (!session?.user?.id) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    // Get the effective user ID
    // When impersonating, we want the subscription of the user being viewed (query param)
    // When not impersonating, we want the current user's subscription
    const userId = req.query.id as string | undefined
    const userIdToUse = userId || session?.user?.id

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
