import type { SubscriptionTier } from '@prisma/client'
import type { NextApiRequest, NextApiResponse } from 'next'

import prisma from '@/lib/db'
import { getSubscription, isInGracePeriod, SUBSCRIPTION_TIERS } from '@/utils/subscription'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { username } = req.query

    if (!username || typeof username !== 'string') {
      res.status(400).json({ error: 'Username is required' })
      return
    }

    // Find the user by username
    const user = await prisma.user.findFirst({
      select: {
        id: true,
      },
      where: {
        name: username.toLowerCase(),
      },
    })

    if (!user) {
      res.status(404).json({ error: 'User not found' })
      return
    }

    // Get the subscription for the user
    const subscription = await getSubscription(user.id)

    // Check if we're in the grace period
    const inGracePeriod = isInGracePeriod()

    // Determine if the user has an actual paid subscription or lifetime plan
    const hasPaidOrLifetime =
      subscription &&
      (subscription.stripeSubscriptionId || subscription.transactionType === 'LIFETIME')

    // User is on grace period Pro if we're in grace period and they don't have a paid plan
    const isGracePeriodPro = inGracePeriod && !hasPaidOrLifetime

    if (!subscription) {
      res.status(200).json({
        inGracePeriod,
        isGracePeriodPro: false,
        isLifetime: false,
        isPro: false,
        status: null,
        tier: SUBSCRIPTION_TIERS.FREE,
      })
      return
    }

    // Return subscription information
    res.status(200).json({
      inGracePeriod,
      isGracePeriodPro,
      isLifetime: subscription.transactionType === 'LIFETIME',
      isPro: subscription.tier === SUBSCRIPTION_TIERS.PRO,
      status: subscription.status,
      tier: subscription.tier,
    })
    return
  } catch (error) {
    console.error('Error in subscription by username route:', error)
    res.status(500).json({ error: 'Internal Server Error' })
    return
  }
}
