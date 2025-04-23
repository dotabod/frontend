import prisma from '@/lib/db'
import { SUBSCRIPTION_TIERS, getSubscription, isInGracePeriod } from '@/utils/subscription'
import type { SubscriptionTier } from '@prisma/client'
import type { NextApiRequest, NextApiResponse } from 'next'
import { withMethods } from '@/lib/api-middlewares/with-methods'

async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Add cache headers to heavily reduce function invocations
  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300')
  
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

    // Check if we're in the grace period
    const inGracePeriod = isInGracePeriod()

    // Determine if the user has an actual paid subscription or lifetime plan
    const hasPaidOrLifetime =
      subscription &&
      (subscription.stripeSubscriptionId || subscription.transactionType === 'LIFETIME')

    // User is on grace period Pro if we're in grace period and they don't have a paid plan
    const isGracePeriodPro = inGracePeriod && !hasPaidOrLifetime

    if (!subscription) {
      return res.status(200).json({
        tier: SUBSCRIPTION_TIERS.FREE,
        status: null,
        isPro: false,
        isGracePeriodPro: false,
        isLifetime: false,
        inGracePeriod,
      })
    }

    // Return subscription information
    return res.status(200).json({
      tier: subscription.tier as SubscriptionTier,
      status: subscription.status,
      isPro: subscription.tier === SUBSCRIPTION_TIERS.PRO,
      isGracePeriodPro,
      isLifetime: subscription.transactionType === 'LIFETIME',
      inGracePeriod,
    })
  } catch (error) {
    console.error('Error in subscription by username route:', error)
    return res.status(500).json({ error: 'Internal Server Error' })
  }
}

export default withMethods(['GET'], handler)
