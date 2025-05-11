import { aggregateGiftDuration, calculateGiftEndDate } from '@/lib/gift-subscription'
import { describe, expect, it } from 'vitest'

describe('Gift Subscription Utilities', () => {
  describe('calculateGiftEndDate', () => {
    it('should correctly calculate monthly gift subscription end dates', () => {
      const startDate = new Date('2025-03-15T00:00:00Z')
      const endDate = calculateGiftEndDate('monthly', 1, startDate)
      expect(endDate.toISOString()).toBe('2025-04-15T00:00:00.000Z')

      // Test with multiple months
      const endDate2 = calculateGiftEndDate('monthly', 3, startDate)
      expect(endDate2.toISOString()).toBe('2025-06-15T00:00:00.000Z')
    })

    it('should correctly calculate annual gift subscription end dates', () => {
      const startDate = new Date('2025-03-15T00:00:00Z')
      const endDate = calculateGiftEndDate('annual', 1, startDate)
      expect(endDate.toISOString()).toBe('2026-03-15T00:00:00.000Z')

      // Test with multiple years
      const endDate2 = calculateGiftEndDate('annual', 2, startDate)
      expect(endDate2.toISOString()).toBe('2027-03-15T00:00:00.000Z')
    })

    it('should handle month-end edge cases correctly', () => {
      // Test with January 31 (should handle February correctly)
      const startDate = new Date('2025-01-31T00:00:00Z')
      const endDate = calculateGiftEndDate('monthly', 1, startDate)

      console.log('End date:', endDate.toISOString())
      console.log('End date year:', endDate.getFullYear())
      console.log('End date month:', endDate.getMonth())
      console.log('End date day:', endDate.getDate())

      // Check the result - should be February 28 in a non-leap year
      expect(endDate.getFullYear()).toBe(2025)
      expect(endDate.getMonth()).toBe(1) // February is month 1 (0-indexed)
      expect(endDate.getDate()).toBe(28) // Last day of February 2025

      // Test with a leap year
      const leapYearStart = new Date('2024-01-31T00:00:00Z')
      const leapYearEnd = calculateGiftEndDate('monthly', 1, leapYearStart)

      console.log('Leap year end date:', leapYearEnd.toISOString())
      console.log('Leap year end date year:', leapYearEnd.getFullYear())
      console.log('Leap year end date month:', leapYearEnd.getMonth())
      console.log('Leap year end date day:', leapYearEnd.getDate())

      // Check the result - should be February 29 in a leap year
      expect(leapYearEnd.getFullYear()).toBe(2024)
      expect(leapYearEnd.getMonth()).toBe(1) // February is month 1 (0-indexed)
      expect(leapYearEnd.getDate()).toBe(29) // Last day of February 2024 (leap year)
    })

    it('should handle lifetime gift subscriptions correctly', () => {
      const startDate = new Date('2025-03-15T00:00:00Z')
      const endDate = calculateGiftEndDate('lifetime', 1, startDate)

      // Lifetime should set a far future date (e.g., 100 years)
      expect(endDate.getFullYear()).toBeGreaterThanOrEqual(2125)
    })
  })

  describe('aggregateGiftDuration', () => {
    it('should correctly aggregate gift durations when no active subscription exists', () => {
      const now = new Date('2025-03-15T00:00:00Z')
      const giftType = 'monthly'
      const quantity = 3
      const currentExpiration = null

      const newExpiration = aggregateGiftDuration(giftType, quantity, currentExpiration, now)

      // Should be now + 3 months
      expect(newExpiration.toISOString()).toBe('2025-06-15T00:00:00.000Z')
    })

    it('should correctly aggregate gift durations when an active subscription exists', () => {
      const now = new Date('2025-03-15T00:00:00Z')
      const giftType = 'monthly'
      const quantity = 2
      const currentExpiration = new Date('2025-05-15T00:00:00Z') // 2 months from now

      const newExpiration = aggregateGiftDuration(giftType, quantity, currentExpiration, now)

      // Should be current expiration + 2 months = 4 months from now
      expect(newExpiration.toISOString()).toBe('2025-07-15T00:00:00.000Z')
    })

    it('should correctly aggregate gift durations when current subscription has expired', () => {
      const now = new Date('2025-03-15T00:00:00Z')
      const giftType = 'monthly'
      const quantity = 2
      const currentExpiration = new Date('2025-02-15T00:00:00Z') // 1 month ago

      const newExpiration = aggregateGiftDuration(giftType, quantity, currentExpiration, now)

      // Should be now + 2 months since current subscription has expired
      expect(newExpiration.toISOString()).toBe('2025-05-15T00:00:00.000Z')
    })

    it('should handle lifetime gift subscriptions correctly', () => {
      const now = new Date('2025-03-15T00:00:00Z')
      const giftType = 'lifetime'
      const quantity = 1
      const currentExpiration = new Date('2025-05-15T00:00:00Z')

      const newExpiration = aggregateGiftDuration(giftType, quantity, currentExpiration, now)

      // Lifetime should set a far future date (e.g., 100 years)
      expect(newExpiration.getFullYear()).toBeGreaterThanOrEqual(2125)
    })

    it('should prioritize lifetime over other gift types', () => {
      const now = new Date('2025-03-15T00:00:00Z')

      // First set a lifetime subscription
      const lifetimeExpiration = aggregateGiftDuration('lifetime', 1, null, now)

      // Then try to add a monthly subscription on top
      const newExpiration = aggregateGiftDuration('monthly', 3, lifetimeExpiration, now)

      // Should still be lifetime (far future date)
      expect(newExpiration.getFullYear()).toBeGreaterThanOrEqual(2125)
      // And should be the same as the original lifetime date
      expect(newExpiration).toEqual(lifetimeExpiration)
    })
  })
})
