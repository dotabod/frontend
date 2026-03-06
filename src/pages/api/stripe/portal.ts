import type { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/db'
import { stripe } from '@/lib/stripe-server'
import { getSubscription } from '@/utils/subscription'

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

    // First check current subscription context
    const subscription = await getSubscription(session.user.id)
    let customerId = subscription?.stripeCustomerId

    // Fallback to historical records in case the user no longer has
    // an active/trialing row but still has a Stripe customer account
    if (!customerId) {
      const historicalSubscription = await prisma.subscription.findFirst({
        where: {
          userId: session.user.id,
          stripeCustomerId: { not: null },
        },
        select: { stripeCustomerId: true },
        orderBy: { updatedAt: 'desc' },
      })

      customerId = historicalSubscription?.stripeCustomerId || null
    }

    if (!customerId) {
      return res.status(400).json({
        error: 'No Stripe customer found',
        code: 'NO_STRIPE_CUSTOMER',
        guidance: 'No active Stripe billing profile found. If you need help, contact support.',
      })
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
    return res.status(500).json({
      error: 'Failed to create Stripe portal session',
      code: 'PORTAL_SESSION_FAILED',
      guidance: 'Please try again in a moment. If this keeps happening, contact support.',
    })
  }
}
