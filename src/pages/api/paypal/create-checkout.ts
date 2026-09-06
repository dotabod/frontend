import type { NextApiRequest, NextApiResponse } from 'next'

import { getServerSession } from '@/lib/api/get-server-session'
import { authOptions } from '@/lib/auth'
import { featureFlags } from '@/lib/feature-flags'
import { createPaypalApproval } from '@/lib/paypal-checkout'

// Dedicated PayPal checkout endpoint. Intentionally does NOT import stripe-server
// So PayPal works without Stripe credentials (fully decoupled).
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  if (!featureFlags.enablePaypalPayments) {
    res.status(403).json({ error: 'PayPal payments are not enabled' })
    return
  }

  try {
    const session = await getServerSession(req, res, authOptions)
    if (!session?.user) {
      res.status(401).json({ error: 'Unauthorized' })
      return
    }
    if (session.user.isImpersonating) {
      res.status(403).json({ error: 'Unauthorized: Impersonation not allowed' })
      return
    }

    const { period } = (await req.body) as { period?: string }
    if (period !== 'monthly' && period !== 'annual' && period !== 'lifetime') {
      res.status(400).json({ error: 'Valid period is required' })
      return
    }

    const url = await createPaypalApproval({
      email: session.user.email ?? undefined,
      period,
      userId: session.user.id,
    })

    res.status(200).json({ url })
    return
  } catch (error) {
    console.error('PayPal checkout creation failed:', error)
    res.status(500).json({ error: 'Failed to create PayPal checkout' })
    return
  }
}
