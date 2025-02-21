import type { SubscriptionPriceId } from '@/types/subscription'

export const PRICE_IDS: SubscriptionPriceId[] = [
  {
    tier: 'starter',
    monthly: process.env.NEXT_PUBLIC_STRIPE_STARTER_MONTHLY_PRICE_ID || '',
    annual: process.env.NEXT_PUBLIC_STRIPE_STARTER_ANNUAL_PRICE_ID || '',
  },
  {
    tier: 'pro',
    monthly: process.env.NEXT_PUBLIC_STRIPE_PRO_MONTHLY_PRICE_ID || '',
    annual: process.env.NEXT_PUBLIC_STRIPE_PRO_ANNUAL_PRICE_ID || '',
  },
]

// Add validation
if (PRICE_IDS.some((price) => !price.monthly || !price.annual)) {
  throw new Error('Missing required Stripe price IDs in environment variables')
}

export async function createCheckoutSession(
  priceId: string,
  userId: string
): Promise<{ url: string }> {
  const response = await fetch('/api/stripe/create-checkout', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ priceId, userId }),
  })

  if (!response.ok) {
    throw new Error('Failed to create checkout session')
  }

  return response.json()
}

export async function createPortalSession(
  userId: string
): Promise<{ url: string }> {
  const response = await fetch('/api/stripe/create-portal', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ userId }),
  })

  if (!response.ok) {
    throw new Error('Failed to create portal session')
  }

  return response.json()
}

export function getPriceId(
  tier: 'starter' | 'pro',
  interval: 'monthly' | 'annual'
): string {
  const price = PRICE_IDS.find((p) => p.tier === tier)
  if (!price) throw new Error(`No price found for tier ${tier}`)
  return interval === 'monthly' ? price.monthly : price.annual
}
