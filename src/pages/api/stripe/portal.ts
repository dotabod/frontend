import type { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'

import { authOptions } from '@/lib/auth'
import prisma from '@/lib/db'
import { stripe } from '@/lib/stripe-server'
import { getSubscription } from '@/utils/subscription'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  try {
    const session = await getServerSession(req, res, authOptions)
    if (session?.user?.isImpersonating) {
      res.status(403).json({ message: 'Unauthorized' })
      return
    }
    if (!session?.user) {
      res.status(401).json({ error: 'Unauthorized' })
      return
    }

    // First check current subscription context
    const subscription = await getSubscription(session.user.id)
    let customerId = subscription?.stripeCustomerId

    // Fallback to historical records in case the user no longer has
    // An active/trialing row but still has a Stripe customer account
    if (!customerId) {
      const historicalSubscription = await prisma.subscription.findFirst({
        orderBy: { updatedAt: 'desc' },
        select: { stripeCustomerId: true },
        where: {
          stripeCustomerId: { not: null },
          userId: session.user.id,
        },
      })

      customerId = historicalSubscription?.stripeCustomerId || null
    }

    if (!customerId) {
      res.status(400).json({
        code: 'NO_STRIPE_CUSTOMER',
        error: 'No Stripe customer found',
        guidance: 'No active Stripe billing profile found. If you need help, contact support.',
      })
      return
    }

    // Ensure return URL has explicit https:// scheme
    const baseUrl = process.env.NEXTAUTH_URL || 'https://dotabod.com'
    const returnUrl = baseUrl.startsWith('http') ? baseUrl : `https://${baseUrl}`

    // Create customer portal session
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${returnUrl}/dashboard/billing`,
    })

    res.status(200).json({ url: portalSession.url })
    return
  } catch (error) {
    console.error('Error creating portal session:', error)
    res.status(500).json({
      code: 'PORTAL_SESSION_FAILED',
      error: 'Failed to create Stripe portal session',
      guidance: 'Please try again in a moment. If this keeps happening, contact support.',
    })
    return
  }
}
