import { getServerSession } from '@/lib/api/getServerSession'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/db'
import { stripe } from '@/lib/stripe-server'
import type { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const session = await getServerSession(req, res, authOptions)
    if (session?.user?.isImpersonating) {
      return res.status(403).json({ message: 'Unauthorized' })
    }
    if (!session?.user?.id) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const { priceId } = req.body
    if (!priceId) {
      return res.status(400).json({ error: 'Price ID is required' })
    }

    // Get current subscription
    const subscription = await prisma.subscription.findUnique({
      where: { userId: session.user.id },
      select: { stripeSubscriptionId: true },
    })

    if (!subscription?.stripeSubscriptionId) {
      return res.status(400).json({ error: 'No active subscription found' })
    }

    // Update the subscription with the new price
    const updatedSubscription = await stripe.subscriptions.retrieve(
      subscription.stripeSubscriptionId,
    )

    await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
      items: [
        {
          id: updatedSubscription.items.data[0].id,
          price: priceId,
        },
      ],
      proration_behavior: 'always_invoice', // Immediately invoice for upgrades/downgrades
    })

    return res.status(200).json({ success: true })
  } catch (error) {
    console.error('Error updating subscription:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
