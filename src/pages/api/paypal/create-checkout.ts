import type { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from '@/lib/api/getServerSession'
import { authOptions } from '@/lib/auth'
import { featureFlags } from '@/lib/featureFlags'
import { createPaypalApproval } from '@/lib/paypal-checkout'

// Dedicated PayPal checkout endpoint. Intentionally does NOT import stripe-server
// so PayPal works without Stripe credentials (fully decoupled).
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  if (!featureFlags.enablePaypalPayments) {
    return res.status(403).json({ error: 'PayPal payments are not enabled' })
  }

  try {
    const session = await getServerSession(req, res, authOptions)
    if (!session?.user) {
      return res.status(401).json({ error: 'Unauthorized' })
    }
    if (session.user.isImpersonating) {
      return res.status(403).json({ error: 'Unauthorized: Impersonation not allowed' })
    }

    const { period } = (await req.body) as { period?: string }
    if (period !== 'monthly' && period !== 'annual' && period !== 'lifetime') {
      return res.status(400).json({ error: 'Valid period is required' })
    }

    const url = await createPaypalApproval({
      period,
      userId: session.user.id,
      email: session.user.email ?? undefined,
    })

    return res.status(200).json({ url })
  } catch (error) {
    console.error('PayPal checkout creation failed:', error)
    return res.status(500).json({ error: 'Failed to create PayPal checkout' })
  }
}
