import type { PricePeriod } from '@/utils/subscription'

export interface GiftCheckoutParams {
  recipientUsername: string
  priceId: string
  giftDuration: PricePeriod
  giftMessage?: string
  giftSenderName?: string
}

/**
 * Creates a checkout session for gifting a subscription
 * @param params Gift checkout parameters
 * @returns The checkout URL
 */
export async function createGiftCheckoutSession(
  params: GiftCheckoutParams,
): Promise<{ url: string }> {
  const response = await fetch('/api/stripe/create-gift-checkout', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(params),
  })

  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(errorData.error || 'Failed to create gift checkout session')
  }

  return response.json()
}
