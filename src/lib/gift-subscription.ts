import type { GiftCheckoutRequest } from '@/pages/api/stripe/create-gift-checkout'

export type GiftCheckoutParams = GiftCheckoutRequest

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

/**
 * Fetches gift subscription information for the current user
 * @returns Gift subscription information
 */
export async function fetchGiftSubscriptions(): Promise<{
  hasGifts: boolean
  giftCount: number
  giftMessage: string
  giftSubscriptions?: Array<{
    id: string
    endDate: Date | null
    senderName: string
  }>
}> {
  try {
    const response = await fetch('/api/user/gift-subscriptions')

    if (!response.ok) {
      throw new Error('Failed to fetch gift subscriptions')
    }

    return response.json()
  } catch (error) {
    console.error('Error fetching gift subscriptions:', error)
    return {
      hasGifts: false,
      giftCount: 0,
      giftMessage: '',
    }
  }
}
