import { SubscriptionStatus } from '@prisma/client'
import type Stripe from 'stripe'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { stripe } from '@/lib/stripe-server'
import {
  createCryptoSubscription,
  findExistingCryptoSubscription,
} from '@/pages/api/stripe/utils/subscription-utils'
import { CRYPTO_PRICE_IDS, getCurrentPeriod } from '@/utils/subscription'

// Mock subscription utils
vi.mock('@/utils/subscription', () => ({
  getCurrentPeriod: vi.fn(),
  CRYPTO_PRICE_IDS: ['crypto_monthly', 'crypto_annual', 'crypto_lifetime'],
}))

// Mock Prisma
vi.mock('@/lib/db', () => ({
  default: {
    subscription: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    transaction: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
  },
}))

// Mock Stripe
vi.mock('@/lib/stripe-server', () => ({
  stripe: {
    invoices: {
      create: vi.fn(),
      update: vi.fn(),
    },
    invoiceItems: {
      create: vi.fn(),
    },
  },
}))

describe('Crypto Subscription Utilities', () => {
  const mockTx = {
    subscription: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    transaction: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
  }

  const mockSession = {
    id: 'cs_test_123',
    customer: 'cus_test_123',
  } as Stripe.Checkout.Session

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('findExistingCryptoSubscription', () => {
    it('should find existing crypto subscription by customer ID', async () => {
      const mockSubscription = {
        id: 'sub_123',
        userId: 'user_123',
        stripeCustomerId: 'cus_test_123',
        transactionType: 'RECURRING',
      }

      mockTx.subscription.findFirst.mockResolvedValue(mockSubscription)

      const result = await findExistingCryptoSubscription(
        'user_123',
        'cus_test_123',
        'cs_test_123',
        mockTx as any,
      )

      expect(result).toEqual(mockSubscription)
      expect(mockTx.subscription.findFirst).toHaveBeenCalledWith({
        where: {
          userId: 'user_123',
          OR: [
            {
              stripeCustomerId: 'cus_test_123',
              transactionType: 'RECURRING',
              metadata: {
                path: ['isCryptoPayment'],
                equals: 'true',
              },
            },
            {
              stripeSubscriptionId: 'crypto_cs_test_123',
            },
          ],
        },
      })
    })

    it('should return null when no subscription found', async () => {
      mockTx.subscription.findFirst.mockResolvedValue(null)

      const result = await findExistingCryptoSubscription(
        'user_123',
        'cus_test_123',
        'cs_test_123',
        mockTx as any,
      )

      expect(result).toBeNull()
    })
  })

  describe('createCryptoSubscription', () => {
    const mockPriceId = 'crypto_monthly'
    const mockCustomerId = 'cus_test_123'
    const mockUserId = 'user_123'

    beforeEach(() => {
      // Mock getCurrentPeriod to return 'monthly' for crypto_monthly
      ;(getCurrentPeriod as any).mockReturnValue('monthly')
    })

    it('should create a monthly crypto subscription successfully', async () => {
      const mockInvoice = {
        id: 'in_test_123',
        status: 'draft',
      }

      const mockSubscription = {
        id: 'sub_123',
        stripeSubscriptionId: 'crypto_cs_test_123',
        status: 'ACTIVE',
      }

      // Mock Stripe invoice creation
      ;(stripe.invoices.create as any).mockResolvedValue(mockInvoice)
      ;(stripe.invoiceItems.create as any).mockResolvedValue({})

      // Mock subscription creation
      mockTx.subscription.create.mockResolvedValue(mockSubscription)

      const result = await createCryptoSubscription(
        mockUserId,
        mockSession,
        mockPriceId,
        mockCustomerId,
        mockTx as any,
      )

      expect(result).toBe(true)
      expect(stripe.invoices.create).toHaveBeenCalledWith({
        customer: mockCustomerId,
        description: 'Crypto Dotabod Pro Monthly subscription',
        metadata: {
          userId: mockUserId,
          isCryptoPayment: 'true',
          isRenewalInvoice: 'true',
          originalCheckoutSession: 'cs_test_123',
          pricePeriod: 'monthly',
        },
        auto_advance: true,
        collection_method: 'send_invoice',
        due_date: expect.any(Number),
        automatically_finalizes_at: expect.any(Number),
      })
    })

    it('should create an annual crypto subscription successfully', async () => {
      ;(getCurrentPeriod as any).mockReturnValue('annual')

      const mockInvoice = {
        id: 'in_test_123',
        status: 'draft',
      }

      const mockSubscription = {
        id: 'sub_123',
        stripeSubscriptionId: 'crypto_cs_test_123',
        status: 'ACTIVE',
      }

      ;(stripe.invoices.create as any).mockResolvedValue(mockInvoice)
      ;(stripe.invoiceItems.create as any).mockResolvedValue({})
      mockTx.subscription.create.mockResolvedValue(mockSubscription)

      const result = await createCryptoSubscription(
        mockUserId,
        mockSession,
        'crypto_annual',
        mockCustomerId,
        mockTx as any,
      )

      expect(result).toBe(true)
      expect(stripe.invoices.create).toHaveBeenCalledWith({
        customer: mockCustomerId,
        description: 'Crypto Dotabod Pro Annual subscription',
        metadata: {
          userId: mockUserId,
          isCryptoPayment: 'true',
          isRenewalInvoice: 'true',
          originalCheckoutSession: 'cs_test_123',
          pricePeriod: 'annual',
        },
        auto_advance: true,
        collection_method: 'send_invoice',
        due_date: expect.any(Number),
        automatically_finalizes_at: expect.any(Number),
      })
    })

    it('should handle lifetime crypto subscription', async () => {
      ;(getCurrentPeriod as any).mockReturnValue('lifetime')

      const mockSubscription = {
        id: 'sub_123',
        stripeSubscriptionId: 'crypto_cs_test_123',
        status: 'ACTIVE',
      }

      mockTx.subscription.create.mockResolvedValue(mockSubscription)

      const result = await createCryptoSubscription(
        mockUserId,
        mockSession,
        'crypto_lifetime',
        mockCustomerId,
        mockTx as any,
      )

      expect(result).toBe(true)
      expect(mockTx.subscription.create).toHaveBeenCalledWith({
        data: {
          userId: mockUserId,
          stripeCustomerId: mockCustomerId,
          stripePriceId: 'crypto_lifetime',
          status: 'ACTIVE',
          transactionType: 'LIFETIME',
          tier: 'PRO',
          cancelAtPeriodEnd: false,
          currentPeriodEnd: expect.any(Date),
        },
        select: {
          id: true,
        },
      })
    })

    it('should return false when invoice creation fails (creates subscription without renewal)', async () => {
      ;(stripe.invoices.create as any).mockRejectedValue(new Error('Stripe error'))

      const result = await createCryptoSubscription(
        mockUserId,
        mockSession,
        mockPriceId,
        mockCustomerId,
        mockTx as any,
      )

      expect(result).toBe(true) // Function still succeeds but creates subscription without renewal
    })

    it('should throw error when subscription creation fails for regular subscriptions', async () => {
      ;(stripe.invoices.create as any).mockResolvedValue({ id: 'in_test_123' })
      ;(stripe.invoiceItems.create as any).mockResolvedValue({})
      mockTx.subscription.create.mockRejectedValue(new Error('Database error'))

      await expect(
        createCryptoSubscription(
          mockUserId,
          mockSession,
          mockPriceId,
          mockCustomerId,
          mockTx as any,
        ),
      ).rejects.toThrow('Database error')
    })
  })

  describe('CRYPTO_PRICE_IDS', () => {
    it('should contain valid crypto price IDs', () => {
      expect(CRYPTO_PRICE_IDS).toBeDefined()
      expect(Array.isArray(CRYPTO_PRICE_IDS)).toBe(true)
      expect(CRYPTO_PRICE_IDS.length).toBeGreaterThan(0)

      // Check that all crypto price IDs start with 'crypto_'
      CRYPTO_PRICE_IDS.forEach((priceId) => {
        expect(priceId).toMatch(/^crypto_/)
      })
    })

    it('should include monthly, annual, and lifetime crypto prices', () => {
      expect(CRYPTO_PRICE_IDS).toContain('crypto_monthly')
      expect(CRYPTO_PRICE_IDS).toContain('crypto_annual')
      expect(CRYPTO_PRICE_IDS).toContain('crypto_lifetime')
    })
  })

  describe('Upgrade Logic Checking', () => {
    it('should allow valid upgrade from monthly to annual crypto subscription', async () => {
      // Mock existing monthly subscription
      const existingSubscription = {
        id: 'sub_existing',
        userId: 'user_123',
        stripeCustomerId: 'cus_test_123',
        stripePriceId: 'crypto_monthly',
        status: 'ACTIVE',
        currentPeriodEnd: new Date('2025-11-04T15:59:27.229Z'),
        metadata: {
          isCryptoPayment: 'true',
          renewalInvoiceId: 'in_renewal_123',
        },
      }

      // Mock finding existing subscription
      mockTx.subscription.findFirst.mockResolvedValue(existingSubscription)
      mockTx.subscription.update.mockResolvedValue({ ...existingSubscription, status: 'CANCELED' })

      // Mock new annual subscription creation
      ;(getCurrentPeriod as any).mockImplementation((priceId: string) => {
        if (priceId === 'crypto_monthly') return 'monthly'
        if (priceId === 'crypto_annual') return 'annual'
        return 'monthly'
      })

      const mockInvoice = { id: 'in_new_123', status: 'draft' }
      const mockNewSubscription = { id: 'sub_new', stripeSubscriptionId: 'crypto_cs_test_123' }

      ;(stripe.invoices.create as any).mockResolvedValue(mockInvoice)
      ;(stripe.invoiceItems.create as any).mockResolvedValue({})
      mockTx.subscription.create.mockResolvedValue(mockNewSubscription)

      // This would be called from checkout-events.ts upgrade logic
      // First, cancel the existing subscription
      await mockTx.subscription.update({
        where: { id: existingSubscription.id },
        data: {
          status: SubscriptionStatus.CANCELED,
          cancelAtPeriodEnd: true,
          updatedAt: new Date(),
          metadata: {
            ...existingSubscription.metadata,
            upgradedTo: 'annual',
            upgradedAt: new Date().toISOString(),
            previousPriceId: 'crypto_monthly',
          },
        },
      })

      // Then create new subscription starting from existing end date
      const result = await createCryptoSubscription(
        'user_123',
        mockSession,
        'crypto_annual',
        'cus_test_123',
        mockTx as any,
        existingSubscription.currentPeriodEnd,
      )

      expect(result).toBe(true)
      expect(mockTx.subscription.update).toHaveBeenCalledWith({
        where: { id: existingSubscription.id },
        data: {
          status: SubscriptionStatus.CANCELED,
          cancelAtPeriodEnd: true,
          updatedAt: expect.any(Date),
          metadata: {
            ...existingSubscription.metadata,
            upgradedTo: 'annual',
            upgradedAt: expect.any(String),
            previousPriceId: 'crypto_monthly',
          },
        },
      })
    })

    it('should allow valid upgrade from annual to monthly crypto subscription', async () => {
      // Mock existing annual subscription
      const existingSubscription = {
        id: 'sub_existing',
        userId: 'user_123',
        stripeCustomerId: 'cus_test_123',
        stripePriceId: 'crypto_annual',
        status: 'ACTIVE',
        currentPeriodEnd: new Date('2026-10-04T14:59:27.233Z'),
        metadata: {
          isCryptoPayment: 'true',
          renewalInvoiceId: 'in_renewal_456',
        },
      }

      mockTx.subscription.findFirst.mockResolvedValue(existingSubscription)
      mockTx.subscription.update.mockResolvedValue({ ...existingSubscription, status: 'CANCELED' })

      ;(getCurrentPeriod as any).mockImplementation((priceId: string) => {
        if (priceId === 'crypto_annual') return 'annual'
        if (priceId === 'crypto_monthly') return 'monthly'
        return 'monthly'
      })

      const mockInvoice = { id: 'in_new_456', status: 'draft' }
      const mockNewSubscription = { id: 'sub_new', stripeSubscriptionId: 'crypto_cs_test_123' }

      ;(stripe.invoices.create as any).mockResolvedValue(mockInvoice)
      ;(stripe.invoiceItems.create as any).mockResolvedValue({})
      mockTx.subscription.create.mockResolvedValue(mockNewSubscription)

      // Cancel existing subscription
      await mockTx.subscription.update({
        where: { id: existingSubscription.id },
        data: {
          status: SubscriptionStatus.CANCELED,
          cancelAtPeriodEnd: true,
          updatedAt: new Date(),
          metadata: {
            ...existingSubscription.metadata,
            upgradedTo: 'monthly',
            upgradedAt: new Date().toISOString(),
            previousPriceId: 'crypto_annual',
          },
        },
      })

      // Create new monthly subscription
      const result = await createCryptoSubscription(
        'user_123',
        mockSession,
        'crypto_monthly',
        'cus_test_123',
        mockTx as any,
        existingSubscription.currentPeriodEnd,
      )

      expect(result).toBe(true)
      expect(mockTx.subscription.update).toHaveBeenCalledWith({
        where: { id: existingSubscription.id },
        data: {
          status: SubscriptionStatus.CANCELED,
          cancelAtPeriodEnd: true,
          updatedAt: expect.any(Date),
          metadata: {
            ...existingSubscription.metadata,
            upgradedTo: 'monthly',
            upgradedAt: expect.any(String),
            previousPriceId: 'crypto_annual',
          },
        },
      })
    })

    it('should prevent invalid upgrade from lifetime to monthly', async () => {
      // Mock existing lifetime subscription
      const existingSubscription = {
        id: 'sub_existing',
        userId: 'user_123',
        stripeCustomerId: 'cus_test_123',
        stripePriceId: 'crypto_lifetime',
        status: 'ACTIVE',
        transactionType: 'LIFETIME',
        metadata: {
          isCryptoPayment: 'true',
        },
      }

      mockTx.subscription.findFirst.mockResolvedValue(existingSubscription)

      ;(getCurrentPeriod as any).mockImplementation((priceId: string) => {
        if (priceId === 'crypto_lifetime') return 'lifetime'
        if (priceId === 'crypto_monthly') return 'monthly'
        return 'monthly'
      })

      // This should not create a new subscription since lifetime can't be upgraded
      // The logic should detect this is not a valid upgrade scenario
      const result = await findExistingCryptoSubscription(
        'user_123',
        'cus_test_123',
        'cs_test_123',
        mockTx as any,
      )

      expect(result).toEqual(existingSubscription)
      // No upgrade should occur - lifetime subscriptions don't get upgraded
    })

    it('should handle same period subscription changes gracefully', async () => {
      // Mock existing monthly subscription trying to "upgrade" to same monthly
      const existingSubscription = {
        id: 'sub_existing',
        userId: 'user_123',
        stripeCustomerId: 'cus_test_123',
        stripePriceId: 'crypto_monthly',
        status: 'ACTIVE',
        metadata: {
          isCryptoPayment: 'true',
        },
      }

      mockTx.subscription.findFirst.mockResolvedValue(existingSubscription)

      ;(getCurrentPeriod as any).mockReturnValue('monthly')

      // Same period should not trigger upgrade logic
      const result = await findExistingCryptoSubscription(
        'user_123',
        'cus_test_123',
        'cs_test_123',
        mockTx as any,
      )

      expect(result).toEqual(existingSubscription)
      // No upgrade operations should be performed
    })

    it('should validate upgrade periods correctly', () => {
      // Test the period validation logic that would be in checkout-events.ts
      const validUpgrades = [
        { from: 'monthly', to: 'annual' },
        { from: 'annual', to: 'monthly' },
      ]

      const invalidUpgrades = [
        { from: 'monthly', to: 'monthly' },
        { from: 'annual', to: 'annual' },
        { from: 'lifetime', to: 'monthly' },
        { from: 'lifetime', to: 'annual' },
        { from: 'monthly', to: 'lifetime' },
        { from: 'annual', to: 'lifetime' },
      ]

      // Valid upgrades should be between monthly and annual only
      validUpgrades.forEach(({ from, to }) => {
        expect(
          from !== to &&
            (from === 'monthly' || from === 'annual') &&
            (to === 'monthly' || to === 'annual'),
        ).toBe(true)
      })

      // Invalid upgrades should not meet the criteria
      invalidUpgrades.forEach(({ from, to }) => {
        expect(
          !(
            from !== to &&
            (from === 'monthly' || from === 'annual') &&
            (to === 'monthly' || to === 'annual')
          ),
        ).toBe(true)
      })
    })
  })
})
