import { getServerSession } from '@/lib/api/getServerSession'
import { authOptions } from '@/lib/auth'
import type { NextApiRequest, NextApiResponse } from 'next'
import type { SubscriptionTier } from '@/utils/subscription'
import { SUBSCRIPTION_TIERS, getSubscription } from '@/utils/subscription'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const session = await getServerSession(req, res, authOptions)
    if (!session?.user?.id) {
      return res.status(401).json({ error: 'Unauthorized' })
    }
    if (session?.user?.isImpersonating) {
      return res.status(403).json({ message: 'Unauthorized' })
    }
    const subscription = await getSubscription(session.user.id)
    if (!subscription) {
      return res.status(200).json({
        tier: SUBSCRIPTION_TIERS.FREE,
        status: 'inactive',
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
