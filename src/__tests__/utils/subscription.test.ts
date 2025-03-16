import { describe, it, expect, vi } from 'vitest'
import {
  SubscriptionStatus,
  TransactionType,
  SubscriptionTier,
  type Subscription,
} from '@prisma/client'

// We need to mock the module before importing it
vi.mock('@/utils/subscription', async () => {
  // Import the actual module
  const actual = await vi.importActual('@/utils/subscription')
  return {
    ...actual,
    // We're not mocking getSubscription so we can test the actual implementation
  }
})

// Mock prisma
vi.mock('@/lib/db', () => ({
  default: {
    user: {
      findUnique: vi.fn(),
    },
    subscription: {
      findMany: vi.fn(),
    },
  },
}))

// Import mocked modules
import prisma from '@/lib/db'
import { getSubscription } from '@/utils/subscription'

describe('Subscription priority logic', () => {
  it('should prioritize non-gift active subscription over gift subscription', async () => {
    // Setup test data
    const giftSubscription: Partial<Subscription> = {
      id: '3c8bc61e-5cc6-42a1-b380-1f4f9037e2be',
      tier: SubscriptionTier.PRO,
      status: SubscriptionStatus.ACTIVE,
      transactionType: TransactionType.RECURRING,
      isGift: true,
      stripeSubscriptionId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      userId: 'test-user-id',
      stripeCustomerId: '',
      stripePriceId: '',
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
      metadata: null,
    }

    const selfSubscription: Partial<Subscription> = {
      id: 'dcd97b94-7a25-4c12-af4d-99156621fb4b',
      tier: SubscriptionTier.PRO,
      status: SubscriptionStatus.TRIALING,
      transactionType: TransactionType.RECURRING,
      isGift: false,
      stripeSubscriptionId: 'sub_1R35HBATtc1xLdxvToG0W0pT',
      createdAt: new Date(),
      updatedAt: new Date(),
      userId: 'test-user-id',
      stripeCustomerId: '',
      stripePriceId: '',
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
      metadata: null,
    }

    // Mock the database calls with proper types
    // Set proExpiration to null to avoid the virtual gift subscription
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: 'test-user-id',
      displayName: 'Test User',
      email: 'test@example.com',
      image: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      mmr: 0,
      steam32Id: null,
      followers: null,
      proExpiration: null, // Set to null to avoid virtual gift subscription
      locale: 'en',
      emailVerified: null,
      name: '',
      stream_delay: null,
      stream_online: false,
      stream_start_date: null,
      beta_tester: false,
      kick: null,
      youtube: null,
    })

    vi.mocked(prisma.subscription.findMany).mockResolvedValue([
      giftSubscription,
      selfSubscription,
    ] as Subscription[])

    // Call the actual implementation
    const result = await getSubscription('test-user-id')

    // Verify the result prioritizes the self subscription
    expect(result).not.toBeNull()
    expect(result?.isGift).toBe(false)
    expect(result?.stripeSubscriptionId).toBe('sub_1R35HBATtc1xLdxvToG0W0pT')
  })

  it('should create a virtual gift subscription when proExpiration is set', async () => {
    // Mock the database calls with proper types
    // Set proExpiration to a future date to trigger virtual gift subscription
    const futureDate = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30) // 30 days in the future

    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: 'test-user-id',
      displayName: 'Test User',
      email: 'test@example.com',
      image: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      mmr: 0,
      steam32Id: null,
      followers: null,
      proExpiration: futureDate, // Set to future date to trigger virtual gift subscription
      locale: 'en',
      emailVerified: null,
      name: '',
      stream_delay: null,
      stream_online: false,
      stream_start_date: null,
      beta_tester: false,
      kick: null,
      youtube: null,
    })

    // Return empty array to simulate no subscriptions
    vi.mocked(prisma.subscription.findMany).mockResolvedValue([])

    // Call the actual implementation
    const result = await getSubscription('test-user-id')

    // Verify the result is a virtual gift subscription
    expect(result).not.toBeNull()
    expect(result?.isGift).toBe(true)
    expect(result?.tier).toBe(SubscriptionTier.PRO)
    expect(result?.status).toBe(SubscriptionStatus.ACTIVE)
    expect(result?.currentPeriodEnd).toEqual(futureDate)
  })
})
