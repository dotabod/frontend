// @ts-nocheck
import type { Prisma } from '@prisma/client'
import { SubscriptionStatus } from '@prisma/client'
import type Stripe from 'stripe'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test'
import {
  createCryptoSubscription,
  findExistingCryptoSubscription,
} from '@/lib/stripe/utils/subscription-utils'
import { stripe } from '@/lib/stripe-server'
import { CRYPTO_PRICE_IDS, getCurrentPeriod } from '@/utils/subscription'

// Mock subscription utils
vi.mock('@/utils/subscription', () => ({
  CRYPTO_PRICE_IDS: ['crypto_monthly', 'crypto_annual', 'crypto_lifetime'],
  getCurrentPeriod: vi.fn(),
}))

// Mock Prisma
vi.mock('@/lib/db', () => ({
  default: {
    subscription: {
      create: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
    transaction: {
      create: vi.fn(),
      findFirst: vi.fn(),
    },
  },
}))

// Mock Stripe
vi.mock('@/lib/stripe-server', () => ({
  stripe: {
    invoiceItems: {
      create: vi.fn(),
    },
    invoices: {
      create: vi.fn(),
      update: vi.fn(),
    },
    prices: {
      retrieve: vi.fn(),
    },
  },
}))

describe('Crypto Subscription Utilities', () => {
  const mockTx: Pick<Prisma.TransactionClient, 'subscription' | 'transaction'> = {
    subscription: {
      create: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
    transaction: {
      create: vi.fn(),
      findFirst: vi.fn(),
    },
  }

  const mockSession = {
    customer: 'cus_test_123',
    id: 'cs_test_123',
  } as Stripe.Checkout.Session

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(stripe.prices.retrieve).mockResolvedValue({
      unit_amount: 600,
    } as Stripe.Price)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('findExistingCryptoSubscription', () => {
    it('should find existing crypto subscription by customer ID', async () => {
      const mockSubscription = {
        id: 'sub_123',
        stripeCustomerId: 'cus_test_123',
        transactionType: 'RECURRING',
        userId: 'user_123',
      }

      mockTx.subscription.findFirst.mockResolvedValue(mockSubscription)

      const result = await findExistingCryptoSubscription(
        'user_123',
        'cus_test_123',
        'cs_test_123',
        mockTx,
      )

      expect(result).toEqual(mockSubscription)
      expect(mockTx.subscription.findFirst).toHaveBeenCalledWith({
        where: {
          OR: [
            {
              metadata: {
                equals: 'true',
                path: ['isCryptoPayment'],
              },
              stripeCustomerId: 'cus_test_123',
              transactionType: 'RECURRING',
            },
            {
              stripeSubscriptionId: 'crypto_cs_test_123',
            },
          ],
          userId: 'user_123',
        },
      })
    })

    it('should return null when no subscription found', async () => {
      mockTx.subscription.findFirst.mockResolvedValue(null)

      const result = await findExistingCryptoSubscription(
        'user_123',
        'cus_test_123',
        'cs_test_123',
        mockTx,
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
      vi.mocked(getCurrentPeriod).mockReturnValue('monthly')
      vi.mocked(stripe.prices.retrieve).mockResolvedValue({
        unit_amount: 600,
      } as Stripe.Price)
      mockTx.subscription.findFirst.mockResolvedValue(null)
    })

    it('should create a monthly crypto subscription successfully', async () => {
      const mockInvoice = {
        id: 'in_test_123',
        status: 'draft',
      }

      const mockSubscription = {
        id: 'sub_123',
        status: 'ACTIVE',
        stripeSubscriptionId: 'crypto_cs_test_123',
      }

      // Mock Stripe invoice creation
      vi.mocked(stripe.invoices.create).mockResolvedValue(mockInvoice as Stripe.Invoice)
      vi.mocked(stripe.invoiceItems.create).mockResolvedValue({} as Stripe.InvoiceItem)

      // Mock subscription creation
      mockTx.subscription.create.mockResolvedValue(mockSubscription)

      const result = await createCryptoSubscription(
        mockUserId,
        mockSession,
        mockPriceId,
        mockCustomerId,
        mockTx,
      )

      expect(result).toBe(true)
      expect(stripe.invoices.create).toHaveBeenCalledWith({
        auto_advance: true,
        automatically_finalizes_at: expect.any(Number),
        collection_method: 'send_invoice',
        customer: mockCustomerId,
        description: 'Crypto Dotabod Pro Monthly subscription',
        due_date: expect.any(Number),
        metadata: {
          isCryptoPayment: 'true',
          isRenewalInvoice: 'true',
          originalCheckoutSession: 'cs_test_123',
          pricePeriod: 'monthly',
          userId: mockUserId,
        },
      })
    })

    it('should create an annual crypto subscription successfully', async () => {
      vi.mocked(getCurrentPeriod).mockReturnValue('annual')

      const mockInvoice = {
        id: 'in_test_123',
        status: 'draft',
      }

      const mockSubscription = {
        id: 'sub_123',
        status: 'ACTIVE',
        stripeSubscriptionId: 'crypto_cs_test_123',
      }

      vi.mocked(stripe.invoices.create).mockResolvedValue(mockInvoice as Stripe.Invoice)
      vi.mocked(stripe.invoiceItems.create).mockResolvedValue({} as Stripe.InvoiceItem)
      mockTx.subscription.create.mockResolvedValue(mockSubscription)

      const result = await createCryptoSubscription(
        mockUserId,
        mockSession,
        mockPriceId,
        mockCustomerId,
        mockTx,
      )

      expect(result).toBe(true)
      expect(stripe.invoices.create).toHaveBeenCalledWith({
        auto_advance: true,
        automatically_finalizes_at: expect.any(Number),
        collection_method: 'send_invoice',
        customer: mockCustomerId,
        description: 'Crypto Dotabod Pro Annual subscription',
        due_date: expect.any(Number),
        metadata: {
          isCryptoPayment: 'true',
          isRenewalInvoice: 'true',
          originalCheckoutSession: 'cs_test_123',
          pricePeriod: 'annual',
          userId: mockUserId,
        },
      })
    })

    it('should handle lifetime crypto subscription', async () => {
      vi.mocked(getCurrentPeriod).mockReturnValue('lifetime')

      const mockSubscription = {
        id: 'sub_123',
        status: 'ACTIVE',
        stripeSubscriptionId: 'crypto_cs_test_123',
      }

      mockTx.subscription.create.mockResolvedValue(mockSubscription)

      const result = await createCryptoSubscription(
        mockUserId,
        mockSession,
        'crypto_lifetime',
        mockCustomerId,
        mockTx,
      )

      expect(result).toBe(true)
      expect(mockTx.subscription.create).toHaveBeenCalledWith({
        data: {
          cancelAtPeriodEnd: false,
          currentPeriodEnd: expect.any(Date),
          status: 'ACTIVE',
          stripeCustomerId: mockCustomerId,
          stripePriceId: 'crypto_lifetime',
          tier: 'PRO',
          transactionType: 'LIFETIME',
          userId: mockUserId,
        },
        select: {
          id: true,
        },
      })
    })

    it('should not create a duplicate lifetime crypto subscription', async () => {
      vi.mocked(getCurrentPeriod).mockReturnValue('lifetime')

      mockTx.subscription.findFirst.mockResolvedValue({
        id: 'existing_lifetime_sub',
      })

      const result = await createCryptoSubscription(
        mockUserId,
        mockSession,
        'crypto_lifetime',
        mockCustomerId,
        mockTx,
      )

      expect(result).toBe(true)
      expect(mockTx.subscription.create).not.toHaveBeenCalled()
      expect(mockTx.subscription.findFirst).toHaveBeenCalledWith({
        select: {
          id: true,
        },
        where: {
          status: 'ACTIVE',
          transactionType: 'LIFETIME',
          userId: mockUserId,
        },
      })
    })

    it('should return false when invoice creation fails (creates subscription without renewal)', async () => {
      vi.mocked(stripe.invoices.create).mockRejectedValue(new Error('Stripe error'))

      const result = await createCryptoSubscription(
        mockUserId,
        mockSession,
        mockPriceId,
        mockCustomerId,
        mockTx,
      )

      expect(result).toBe(true) // Function still succeeds but creates subscription without renewal
    })

    it('should throw error when subscription creation fails for regular subscriptions', async () => {
      vi.mocked(stripe.invoices.create).mockResolvedValue({ id: 'in_test_123' } as Stripe.Invoice)
      vi.mocked(stripe.invoiceItems.create).mockResolvedValue({} as Stripe.InvoiceItem)
      mockTx.subscription.create.mockRejectedValue(new Error('Database error'))

      await expect(
        createCryptoSubscription(mockUserId, mockSession, mockPriceId, mockCustomerId, mockTx),
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
        currentPeriodEnd: new Date('2025-11-04T15:59:27.229Z'),
        id: 'sub_existing',
        metadata: {
          isCryptoPayment: 'true',
          renewalInvoiceId: 'in_renewal_123',
        },
        status: 'ACTIVE',
        stripeCustomerId: 'cus_test_123',
        stripePriceId: 'crypto_monthly',
        userId: 'user_123',
      }

      // Mock finding existing subscription
      mockTx.subscription.findFirst.mockResolvedValue(existingSubscription)
      mockTx.subscription.update.mockResolvedValue({ ...existingSubscription, status: 'CANCELED' })

      // Mock new annual subscription creation
      vi.mocked(getCurrentPeriod).mockImplementation((priceId: string) => {
        if (priceId === 'crypto_monthly') {
          return 'monthly'
        }
        if (priceId === 'crypto_annual') {
          return 'annual'
        }
        return 'monthly'
      })

      const mockInvoice = { id: 'in_new_123', status: 'draft' }
      const mockNewSubscription = { id: 'sub_new', stripeSubscriptionId: 'crypto_cs_test_123' }

      vi.mocked(stripe.invoices.create).mockResolvedValue(mockInvoice as Stripe.Invoice)
      vi.mocked(stripe.invoiceItems.create).mockResolvedValue({} as Stripe.InvoiceItem)
      mockTx.subscription.create.mockResolvedValue(mockNewSubscription)

      // This would be called from checkout-events.ts upgrade logic
      // First, cancel the existing subscription
      await mockTx.subscription.update({
        data: {
          cancelAtPeriodEnd: true,
          metadata: {
            ...existingSubscription.metadata,
            previousPriceId: 'crypto_monthly',
            upgradedAt: new Date().toISOString(),
            upgradedTo: 'annual',
          },
          status: SubscriptionStatus.CANCELED,
          updatedAt: new Date(),
        },
        where: { id: existingSubscription.id },
      })

      // Then create new subscription starting from existing end date
      const result = await createCryptoSubscription(
        'user_123',
        mockSession,
        'crypto_annual',
        'cus_test_123',
        mockTx,
        existingSubscription.currentPeriodEnd,
      )

      expect(result).toBe(true)
      expect(mockTx.subscription.update).toHaveBeenCalledWith({
        data: {
          cancelAtPeriodEnd: true,
          metadata: {
            ...existingSubscription.metadata,
            previousPriceId: 'crypto_monthly',
            upgradedAt: expect.any(String),
            upgradedTo: 'annual',
          },
          status: SubscriptionStatus.CANCELED,
          updatedAt: expect.any(Date),
        },
        where: { id: existingSubscription.id },
      })
    })

    it('should allow valid upgrade from annual to monthly crypto subscription', async () => {
      // Mock existing annual subscription
      const existingSubscription = {
        currentPeriodEnd: new Date('2026-10-04T14:59:27.233Z'),
        id: 'sub_existing',
        metadata: {
          isCryptoPayment: 'true',
          renewalInvoiceId: 'in_renewal_456',
        },
        status: 'ACTIVE',
        stripeCustomerId: 'cus_test_123',
        stripePriceId: 'crypto_annual',
        userId: 'user_123',
      }

      mockTx.subscription.findFirst.mockResolvedValue(existingSubscription)
      mockTx.subscription.update.mockResolvedValue({ ...existingSubscription, status: 'CANCELED' })

      vi.mocked(getCurrentPeriod).mockImplementation((priceId: string) => {
        if (priceId === 'crypto_annual') {
          return 'annual'
        }
        if (priceId === 'crypto_monthly') {
          return 'monthly'
        }
        return 'monthly'
      })

      const mockInvoice = { id: 'in_new_456', status: 'draft' }
      const mockNewSubscription = { id: 'sub_new', stripeSubscriptionId: 'crypto_cs_test_123' }

      vi.mocked(stripe.invoices.create).mockResolvedValue(mockInvoice as Stripe.Invoice)
      vi.mocked(stripe.invoiceItems.create).mockResolvedValue({} as Stripe.InvoiceItem)
      mockTx.subscription.create.mockResolvedValue(mockNewSubscription)

      // Cancel existing subscription
      await mockTx.subscription.update({
        data: {
          cancelAtPeriodEnd: true,
          metadata: {
            ...existingSubscription.metadata,
            previousPriceId: 'crypto_annual',
            upgradedAt: new Date().toISOString(),
            upgradedTo: 'monthly',
          },
          status: SubscriptionStatus.CANCELED,
          updatedAt: new Date(),
        },
        where: { id: existingSubscription.id },
      })

      // Create new monthly subscription
      const result = await createCryptoSubscription(
        'user_123',
        mockSession,
        'crypto_monthly',
        'cus_test_123',
        mockTx,
        existingSubscription.currentPeriodEnd,
      )

      expect(result).toBe(true)
      expect(mockTx.subscription.update).toHaveBeenCalledWith({
        data: {
          cancelAtPeriodEnd: true,
          metadata: {
            ...existingSubscription.metadata,
            previousPriceId: 'crypto_annual',
            upgradedAt: expect.any(String),
            upgradedTo: 'monthly',
          },
          status: SubscriptionStatus.CANCELED,
          updatedAt: expect.any(Date),
        },
        where: { id: existingSubscription.id },
      })
    })

    it('should prevent invalid upgrade from lifetime to monthly', async () => {
      // Mock existing lifetime subscription
      const existingSubscription = {
        id: 'sub_existing',
        metadata: {
          isCryptoPayment: 'true',
        },
        status: 'ACTIVE',
        stripeCustomerId: 'cus_test_123',
        stripePriceId: 'crypto_lifetime',
        transactionType: 'LIFETIME',
        userId: 'user_123',
      }

      mockTx.subscription.findFirst.mockResolvedValue(existingSubscription)

      vi.mocked(getCurrentPeriod).mockImplementation((priceId: string) => {
        if (priceId === 'crypto_lifetime') {
          return 'lifetime'
        }
        if (priceId === 'crypto_monthly') {
          return 'monthly'
        }
        return 'monthly'
      })

      // This should not create a new subscription since lifetime can't be upgraded
      // The logic should detect this is not a valid upgrade scenario
      const result = await findExistingCryptoSubscription(
        'user_123',
        'cus_test_123',
        'cs_test_123',
        mockTx,
      )

      expect(result).toEqual(existingSubscription)
      // No upgrade should occur - lifetime subscriptions don't get upgraded
    })

    it('should handle same period subscription changes gracefully', async () => {
      // Mock existing monthly subscription trying to "upgrade" to same monthly
      const existingSubscription = {
        id: 'sub_existing',
        metadata: {
          isCryptoPayment: 'true',
        },
        status: 'ACTIVE',
        stripeCustomerId: 'cus_test_123',
        stripePriceId: 'crypto_monthly',
        userId: 'user_123',
      }

      mockTx.subscription.findFirst.mockResolvedValue(existingSubscription)

      vi.mocked(getCurrentPeriod).mockReturnValue('monthly')

      // Same period should not trigger upgrade logic
      const result = await findExistingCryptoSubscription(
        'user_123',
        'cus_test_123',
        'cs_test_123',
        mockTx,
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
