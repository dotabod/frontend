import type { NextApiRequest, NextApiResponse } from 'next'

import { getServerSession } from '@/lib/api/get-server-session'
import { authOptions } from '@/lib/auth'
import {
  applyGiftCredit,
  createGiftCreditDependencies,
} from '@/lib/stripe/services/gift-credit-service'
import type { GiftCreditResult } from '@/lib/stripe/services/gift-credit-service'

const respond = function respond(res: NextApiResponse, result: GiftCreditResult): void {
  if (result.kind === 'applied') {
    res.status(200).json({
      creditApplied: result.creditApplied,
      message: 'Successfully applied gift credits to create a new subscription',
      priceId: result.priceId,
      success: true,
    })
    return
  }
  if (result.kind === 'no-credit') {
    res.status(200).json({
      balance: result.balance,
      message: 'No credit balance available',
      success: false,
    })
    return
  }
  if (result.kind === 'already-active') {
    res.status(200).json({
      activeSubscription: true,
      message: 'User already has an active subscription',
      success: false,
    })
    return
  }
  if (result.kind === 'user-not-found') {
    res.status(404).json({ error: 'User not found' })
    return
  }
  if (result.kind === 'no-customer') {
    res.status(404).json({ error: 'No Stripe customer found for this user', success: false })
    return
  }
  res.status(404).json({
    error: 'Stripe customer associated with this user has been deleted.',
    success: false,
  })
}

/**
 * Lets a signed-in user turn their own gift credit into a subscription. The gift webhook applies
 * credit itself through applyGiftCredit, so this is the manual path from the dashboard.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
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

    const result = await applyGiftCredit(
      { stripeCustomerId: null, userId: session.user.id },
      createGiftCreditDependencies(),
    )
    respond(res, result)
  } catch (error) {
    console.error('Error applying gift credit:', error)
    res.status(500).json({
      details: error instanceof Error ? error.message : 'Unknown error',
      error: 'Failed to apply gift credits',
      success: false,
    })
  }
}
