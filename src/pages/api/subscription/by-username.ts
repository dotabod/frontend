import prisma from '@/lib/db'
import { SUBSCRIPTION_TIERS, getSubscription } from '@/utils/subscription'
import type { SubscriptionTier } from '@prisma/client'
import type { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { username } = req.query

    if (!username || typeof username !== 'string') {
      return res.status(400).json({ error: 'Username is required' })
    }

    // Find the user by username
    const user = await prisma.user.findFirst({
      where: {
        name: username.toLowerCase(),
      },
      select: {
        id: true,
      },
    })

    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }

    // Get the subscription for the user
    const subscription = await getSubscription(user.id)

    if (!subscription) {
      return res.status(200).json({
        tier: SUBSCRIPTION_TIERS.FREE,
        status: null,
        isPro: false,
      })
    }

    // Return subscription information
    return res.status(200).json({
      tier: subscription.tier as SubscriptionTier,
      status: subscription.status,
      isPro: subscription.tier === SUBSCRIPTION_TIERS.PRO,
      isLifetime: subscription.transactionType === 'LIFETIME',
    })
  } catch (error) {
    console.error('Error in subscription by username route:', error)
    return res.status(500).json({ error: 'Internal Server Error' })
  }
}
