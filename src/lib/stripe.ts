import { getPriceId, PRICE_IDS } from '@/utils/subscription'

export { getPriceId, PRICE_IDS }

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
