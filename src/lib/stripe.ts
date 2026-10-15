import { z } from 'zod'

import { LIVE_SUBSCRIPTION_CODE } from '@/lib/stripe/live-subscription'

const liveSubscriptionConflictSchema = z.object({ code: z.literal(LIVE_SUBSCRIPTION_CODE) })
const portalResponseSchema = z.object({ url: z.string().min(1) })

// The user already has a live card plan, so the checkout endpoint refuses to start a second one.
// Their billing portal is where the existing plan gets a new card or a different period.
const openBillingPortal = async function openBillingPortal(): Promise<{ url: string }> {
  const response = await fetch('/api/stripe/portal', { method: 'POST' })

  if (!response.ok) {
    throw new Error('Failed to open the billing portal')
  }

  return portalResponseSchema.parse(await response.json())
}

export const createCheckoutSession = async function createCheckoutSession(
  priceId: string,
  userId: string,
  paymentMethod?: string,
): Promise<{ url: string }> {
  const response = await fetch('/api/stripe/create-checkout', {
    body: JSON.stringify({ paymentMethod, priceId, userId }),
    headers: {
      'Content-Type': 'application/json',
    },
    method: 'POST',
  })

  if (
    response.status === 409 &&
    liveSubscriptionConflictSchema.safeParse(await response.json().catch(() => null)).success
  ) {
    return await openBillingPortal()
  }

  if (!response.ok) {
    throw new Error('Failed to create checkout session')
  }

  return await response.json()
}
