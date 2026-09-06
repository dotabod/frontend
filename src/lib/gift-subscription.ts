import type { GiftCheckoutRequest } from '@/lib/stripe/gift-checkout-request'

type GiftCheckoutParams = GiftCheckoutRequest

export const createGiftCheckoutSession = async function createGiftCheckoutSession(
  params: GiftCheckoutParams,
): Promise<{ url: string } | { error: string } | { message: string }> {
  const response = await fetch('/api/stripe/create-gift-checkout', {
    body: JSON.stringify(params),
    headers: {
      'Content-Type': 'application/json',
    },
    method: 'POST',
  })

  const data = await response.json()

  if (!response.ok) {
    // Return the error data directly instead of throwing
    return data
  }

  return data
}

export const calculateGiftEndDate = function calculateGiftEndDate(
  giftType: string,
  quantity: number,
  startDate: Date = new Date(),
): Date {
  // Create a new date for safer manipulation
  const endDate = new Date(startDate)
  const originalDay = startDate.getUTCDate()

  // Lifetime subscription (add 100 years)
  if (giftType === 'lifetime') {
    endDate.setUTCFullYear(endDate.getUTCFullYear() + 100)
    return endDate
  }

  // Annual subscription (add years)
  if (giftType === 'annual') {
    endDate.setUTCFullYear(endDate.getUTCFullYear() + quantity)
    return endDate
  }

  // For monthly subscriptions, use a safer approach to add months
  // Calculate target month and year
  const totalMonths = startDate.getUTCMonth() + quantity
  const targetMonth = totalMonths % 12
  const yearsToAdd = Math.floor(totalMonths / 12)

  // Set to 1st of month first to avoid month skipping issues
  endDate.setUTCDate(1)
  endDate.setUTCMonth(targetMonth)
  endDate.setUTCFullYear(startDate.getUTCFullYear() + yearsToAdd)

  // Get the last day of the target month
  const lastDayOfMonth = new Date(
    Date.UTC(endDate.getUTCFullYear(), endDate.getUTCMonth() + 1, 0),
  ).getUTCDate()

  // Set to either original day or last day of month, whichever is smaller
  const finalDay = Math.min(originalDay, lastDayOfMonth)
  endDate.setUTCDate(finalDay)

  return endDate
}

export const aggregateGiftDuration = function aggregateGiftDuration(
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
    // Keep the existing lifetime subscription
    return existingExpiration
  }

  // Determine the base date to start from
  const baseDate =
    existingExpiration && existingExpiration > startDate ? new Date(existingExpiration) : startDate

  // Calculate the new end date
  return calculateGiftEndDate(giftType, quantity, baseDate)
}
