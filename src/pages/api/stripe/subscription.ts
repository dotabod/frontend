import type { SubscriptionTier } from '@prisma/client'
import type { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from '@/lib/api/getServerSession'
import { authOptions } from '@/lib/auth'
import { getSubscription, isSubscriptionActive, SUBSCRIPTION_TIERS } from '@/utils/subscription'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const userId = req.query.id as string | undefined
    const session = userId ? null : await getServerSession(req, res, authOptions)

    // Get the effective user ID
    // When impersonating, we want the subscription of the user being viewed (query param)
    // When not impersonating, we want the current user's subscription
    const userIdToUse = userId || session?.user?.id

    const isPublicOverlayRequest = Boolean(userId)
    if (isPublicOverlayRequest) {
      res.setHeader('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=120')
    } else {
      res.setHeader('Cache-Control', 'private, no-store')
    }

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
