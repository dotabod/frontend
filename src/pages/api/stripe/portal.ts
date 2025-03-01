import { authOptions } from '@/lib/auth'
import { stripe } from '@/lib/stripe-server'
import { getSubscription } from '@/utils/subscription'
import type { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'

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

    // Get or create Stripe customer ID
    // First check if user has a subscription record
    const subscription = await getSubscription(session.user.id)
    const customerId = subscription?.stripeCustomerId

    console.log({ subscription })

    if (!customerId) {
      return res.status(400).json({ error: 'No Stripe customer found' })
    }

    // Ensure return URL has explicit https:// scheme
    const baseUrl = process.env.NEXTAUTH_URL || ''
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
