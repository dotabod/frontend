import type { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { stripe } from '@/lib/stripe-server'
import { getSubscription } from '@/utils/subscription'
import prisma from '@/lib/db'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const session = await getServerSession(req, res, authOptions)
    if (session?.user?.isImpersonating) {
      return res.status(403).json({ message: 'Unauthorized' })
    }
    if (!session?.user) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    // Get customer ID from subscription
    const subscription = await getSubscription(session.user.id)
    let customerId = subscription?.stripeCustomerId

    // If no customer ID from subscription, check if user has any previous subscriptions with a customer ID
    if (!customerId) {
      const subscriptionWithCustomerId = await prisma.subscription.findFirst({
        where: {
          userId: session.user.id,
          stripeCustomerId: { not: null },
        },
        select: { stripeCustomerId: true },
      })

      customerId = subscriptionWithCustomerId?.stripeCustomerId || null
    }

    // If still no customer ID, check OpenNode charges table for stripe customer data
    if (!customerId) {
      const openNodeChargeWithCustomerId = await prisma.openNodeCharge.findFirst({
        where: {
          userId: session.user.id,
          stripeCustomerId: { not: '' },
        },
        select: { stripeCustomerId: true },
        orderBy: { createdAt: 'desc' }, // Get the most recent one
      })

      customerId = openNodeChargeWithCustomerId?.stripeCustomerId || null
    }

    console.log({ subscription, customerId })

    if (!customerId) {
      return res.status(400).json({ error: 'No Stripe customer found' })
    }

    // Ensure return URL has explicit https:// scheme
    const baseUrl = process.env.NEXTAUTH_URL || 'https://dotabod.com'
    const returnUrl = baseUrl.startsWith('http') ? baseUrl : `https://${baseUrl}`

    // Create customer portal session
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${returnUrl}/dashboard/billing`,
    })

    return res.status(200).json({ url: portalSession.url })
  } catch (error) {
    console.error('Error creating portal session:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
