import type { GiftCheckoutRequest } from '@/pages/api/stripe/create-gift-checkout'

export type GiftCheckoutParams = GiftCheckoutRequest

/**
 * Creates a checkout session for gifting a subscription
 * @param params Gift checkout parameters
 * @returns The checkout URL or error information
 */
export async function createGiftCheckoutSession(
  params: GiftCheckoutParams,
): Promise<{ url: string } | { error: string } | { message: string }> {
  const response = await fetch('/api/stripe/create-gift-checkout', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(params),
  })

  const data = await response.json()

  if (!response.ok) {
    // Return the error data directly instead of throwing
    return data
  }

  return data
}

/**
 * Fetches gift subscription information for the current user
 * @returns Gift subscription information
 */
export async function fetchGiftSubscriptions(): Promise<{
  hasGifts: boolean
  giftCount: number
  hasLifetime: boolean
  giftMessage: string
  giftSubscriptions?: Array<{
    id: string
    endDate: Date | null
    senderName: string
    giftType: string
    giftQuantity: number
    giftMessage: string
    createdAt: Date
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
      hasLifetime: false,
      giftMessage: '',
    }
  }
}

/**
 * Calculates the end date for a gift subscription based on type and quantity
 * @param giftType The type of gift (monthly, annual, lifetime)
 * @param quantity The number of periods to add
 * @param startDate The date to start calculating from (defaults to now)
 * @returns The calculated end date
 */
export function calculateGiftEndDate(
  giftType: string,
  quantity: number,
  startDate: Date = new Date(),
): Date {
  if (giftType === 'lifetime') {
    // For lifetime subscriptions, set a far future date (at least 100 years)
    const lifetimeDate = new Date(startDate)
    lifetimeDate.setFullYear(lifetimeDate.getFullYear() + 100)
    return lifetimeDate
  }

  const endDate = new Date(startDate)
  const originalDay = startDate.getDate()

  if (giftType === 'annual') {
    // For annual subscriptions, add years
    endDate.setFullYear(endDate.getFullYear() + quantity)
  } else {
    // For monthly subscriptions
    // Set to first of month to avoid skipping months
    endDate.setDate(1)
    endDate.setMonth(endDate.getMonth() + quantity)

    // Get the last day of the target month
    const lastDayOfMonth = new Date(endDate.getFullYear(), endDate.getMonth() + 1, 0).getDate()

    // Set to either original day or last day of month, whichever is smaller
    endDate.setDate(Math.min(originalDay, lastDayOfMonth))
  }

  return endDate
}

/**
 * Aggregates gift durations to calculate the new expiration date
 * @param giftType The type of gift (monthly, annual, lifetime)
 * @param quantity The number of periods to add
 * @param existingExpiration The existing expiration date (if any)
 * @param startDate The date to start calculating from if no existing expiration
 * @returns The new expiration date
 */
export function aggregateGiftDuration(
  giftType: string,
  quantity: number,
  existingExpiration: Date | null = null,
  startDate: Date = new Date(),
): Date {
  // For lifetime gifts, always return a far future date
  if (giftType === 'lifetime') {
    const lifetimeDate = new Date(startDate)
    lifetimeDate.setFullYear(lifetimeDate.getFullYear() + 100)
    return lifetimeDate
  }

  // Check if existing expiration is already a lifetime subscription
  if (existingExpiration && existingExpiration.getFullYear() >= 2100) {
    return existingExpiration // Keep the existing lifetime subscription
  }

  // Determine the base date to start from
  const baseDate =
    existingExpiration && existingExpiration > startDate ? new Date(existingExpiration) : startDate

  // Calculate the new end date
  return calculateGiftEndDate(giftType, quantity, baseDate)
}
