import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { SubscriptionStatus } from '../SubscriptionStatus'
import { useSubscriptionContext } from '@/contexts/SubscriptionContext'
import { useSession } from 'next-auth/react'
import { fetchGiftSubscriptions } from '@/lib/gift-subscription'
import { SubscriptionStatus as SubStatus, SubscriptionTier, TransactionType } from '@prisma/client'
import type { Session } from 'next-auth'
import type { SubscriptionRow } from '@/utils/subscription'

// Mock dependencies
vi.mock('@/contexts/SubscriptionContext')
vi.mock('next-auth/react')
vi.mock('@/lib/gift-subscription')
vi.mock('@/utils/subscription', () => ({
  getCurrentPeriod: vi.fn().mockReturnValue('monthly'),
  getSubscriptionStatusInfo: vi.fn().mockReturnValue({
    message: 'Test status message',
    type: 'success',
    badge: 'gold',
  }),
  getGiftSubscriptionInfo: vi.fn().mockReturnValue({
    message: 'Test gift message',
    isGift: false,
  }),
  gracePeriodPrettyDate: 'December 31, 2023',
}))

// Import the mocked functions to use in tests
import { getGiftSubscriptionInfo } from '@/utils/subscription'

// Define the type for our mocked subscription context
interface MockSubscriptionContextType {
  subscription: SubscriptionRow | null
  isLoading: boolean
  inGracePeriod: boolean
  hasActivePlan: boolean
  isLifetimePlan: boolean
  isPro: boolean
  isFree: boolean
}

describe('SubscriptionStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Default mock implementations
    vi.mocked(useSubscriptionContext).mockReturnValue({
      subscription: null,
      isLoading: false,
      inGracePeriod: false,
      hasActivePlan: false,
      isLifetimePlan: false,
      isPro: false,
      isFree: true,
    } as MockSubscriptionContextType)

    vi.mocked(useSession).mockReturnValue({
      data: { user: { id: 'test-user-id' } } as Session,
      status: 'authenticated',
      update: vi.fn(),
    })

    vi.mocked(fetchGiftSubscriptions).mockResolvedValue({
      hasGifts: false,
      giftCount: 0,
      giftMessage: '',
    })

    // Reset the default mock implementation for getGiftSubscriptionInfo
    vi.mocked(getGiftSubscriptionInfo).mockReturnValue({
      message: 'Test gift message',
      isGift: false,
    })
  })

  it('renders without alerts when showAlert is false', async () => {
    const mockSubscription: SubscriptionRow = {
      id: '1',
      userId: 'user-1',
      stripeCustomerId: 'cus_123',
      stripePriceId: 'price_123',
      stripeSubscriptionId: 'sub_123',
      tier: SubscriptionTier.PRO,
      status: SubStatus.ACTIVE,
      currentPeriodEnd: new Date(),
      cancelAtPeriodEnd: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      transactionType: TransactionType.RECURRING,
      isGift: false,
    }

    vi.mocked(useSubscriptionContext).mockReturnValue({
      subscription: mockSubscription,
      isLoading: false,
      inGracePeriod: false,
      hasActivePlan: true,
      isLifetimePlan: false,
      isPro: true,
      isFree: false,
    } as MockSubscriptionContextType)

    render(<SubscriptionStatus showAlert={false} />)

    await waitFor(() => {
      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
      expect(screen.getByText(/You are currently on the Pro plan/)).toBeInTheDocument()
    })
  })

  it('displays lifetime access alert for lifetime gift subscriptions', async () => {
    const mockSubscription: SubscriptionRow = {
      id: '1',
      userId: 'user-1',
      stripeCustomerId: 'cus_123',
      stripePriceId: null,
      stripeSubscriptionId: null,
      tier: SubscriptionTier.PRO,
      status: SubStatus.ACTIVE,
      currentPeriodEnd: new Date(),
      cancelAtPeriodEnd: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      transactionType: TransactionType.LIFETIME,
      isGift: true,
    }

    vi.mocked(useSubscriptionContext).mockReturnValue({
      subscription: mockSubscription,
      isLoading: false,
      inGracePeriod: false,
      hasActivePlan: true,
      isLifetimePlan: true,
      isPro: true,
      isFree: false,
    } as MockSubscriptionContextType)

    vi.mocked(getGiftSubscriptionInfo).mockReturnValue({
      message: 'Gift subscription message',
      isGift: true,
    })

    render(<SubscriptionStatus />)

    await waitFor(() => {
      expect(screen.getByText('Lifetime Access')).toBeInTheDocument()
      expect(screen.getByText(/Someone gifted you lifetime access/)).toBeInTheDocument()
    })
  })

  it('displays lifetime access alert for regular lifetime subscriptions', async () => {
    const mockSubscription: SubscriptionRow = {
      id: '1',
      userId: 'user-1',
      stripeCustomerId: 'cus_123',
      stripePriceId: null,
      stripeSubscriptionId: null,
      tier: SubscriptionTier.PRO,
      status: SubStatus.ACTIVE,
      currentPeriodEnd: new Date(),
      cancelAtPeriodEnd: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      transactionType: TransactionType.LIFETIME,
      isGift: false,
    }

    vi.mocked(useSubscriptionContext).mockReturnValue({
      subscription: mockSubscription,
      isLoading: false,
      inGracePeriod: false,
      hasActivePlan: true,
      isLifetimePlan: true,
      isPro: true,
      isFree: false,
    } as MockSubscriptionContextType)

    render(<SubscriptionStatus />)

    await waitFor(() => {
      expect(screen.getByText('Lifetime Access')).toBeInTheDocument()
      expect(screen.getByText(/Thank you for being a lifetime supporter/)).toBeInTheDocument()
    })
  })

  it('displays status info alert for regular subscriptions', async () => {
    const mockSubscription: SubscriptionRow = {
      id: '1',
      userId: 'user-1',
      stripeCustomerId: 'cus_123',
      stripePriceId: 'price_123',
      stripeSubscriptionId: 'sub_123',
      tier: SubscriptionTier.PRO,
      status: SubStatus.ACTIVE,
      currentPeriodEnd: new Date(),
      cancelAtPeriodEnd: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      transactionType: TransactionType.RECURRING,
      isGift: false,
    }

    vi.mocked(useSubscriptionContext).mockReturnValue({
      subscription: mockSubscription,
      isLoading: false,
      inGracePeriod: false,
      hasActivePlan: true,
      isLifetimePlan: false,
      isPro: true,
      isFree: false,
    } as MockSubscriptionContextType)

    render(<SubscriptionStatus />)

    await waitFor(() => {
      expect(screen.getByText('Test status message')).toBeInTheDocument()
    })
  })

  it('displays grace period alert when in grace period with active plan', async () => {
    const mockSubscription: SubscriptionRow = {
      id: '1',
      userId: 'user-1',
      stripeCustomerId: 'cus_123',
      stripePriceId: 'price_123',
      stripeSubscriptionId: 'sub_123',
      tier: SubscriptionTier.PRO,
      status: SubStatus.ACTIVE,
      currentPeriodEnd: new Date(),
      cancelAtPeriodEnd: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      transactionType: TransactionType.RECURRING,
      isGift: false,
    }

    vi.mocked(useSubscriptionContext).mockReturnValue({
      subscription: mockSubscription,
      isLoading: false,
      inGracePeriod: true,
      hasActivePlan: true,
      isLifetimePlan: false,
      isPro: true,
      isFree: false,
    } as MockSubscriptionContextType)

    render(<SubscriptionStatus />)

    await waitFor(() => {
      expect(screen.getByText(/All users have free Pro access until/)).toBeInTheDocument()
      expect(screen.getByText(/but you're already subscribed/)).toBeInTheDocument()
    })
  })

  it('displays gift info alert when user has gifts and their own subscription', async () => {
    const mockSubscription: SubscriptionRow = {
      id: '1',
      userId: 'user-1',
      stripeCustomerId: 'cus_123',
      stripePriceId: 'price_123',
      stripeSubscriptionId: 'sub_123',
      tier: SubscriptionTier.PRO,
      status: SubStatus.ACTIVE,
      currentPeriodEnd: new Date(),
      cancelAtPeriodEnd: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      transactionType: TransactionType.RECURRING,
      isGift: false,
    }

    vi.mocked(useSubscriptionContext).mockReturnValue({
      subscription: mockSubscription,
      isLoading: false,
      inGracePeriod: false,
      hasActivePlan: true,
      isLifetimePlan: false,
      isPro: true,
      isFree: false,
    } as MockSubscriptionContextType)

    vi.mocked(fetchGiftSubscriptions).mockResolvedValue({
      hasGifts: true,
      giftCount: 2,
      giftMessage: 'You have 2 gift subscriptions',
    })

    render(<SubscriptionStatus />)

    await waitFor(() => {
      expect(screen.getByText('You have 2 gift subscriptions')).toBeInTheDocument()
    })
  })

  it('displays gift info alert when user has only gift subscriptions without their own subscription', async () => {
    vi.mocked(useSubscriptionContext).mockReturnValue({
      subscription: null,
      isLoading: false,
      inGracePeriod: false,
      hasActivePlan: false,
      isLifetimePlan: false,
      isPro: true,
      isFree: false,
    } as MockSubscriptionContextType)

    vi.mocked(fetchGiftSubscriptions).mockResolvedValue({
      hasGifts: true,
      giftCount: 4,
      giftMessage: 'You have 4 gift subscriptions',
    })

    render(<SubscriptionStatus />)

    await waitFor(() => {
      expect(screen.getByText('You have 4 gift subscriptions')).toBeInTheDocument()
    })
  })

  it('displays both grace period and gift info alerts when user has only gift subscriptions during grace period', async () => {
    vi.mocked(useSubscriptionContext).mockReturnValue({
      subscription: null,
      isLoading: false,
      inGracePeriod: true,
      hasActivePlan: false,
      isLifetimePlan: false,
      isPro: true,
      isFree: false,
    } as MockSubscriptionContextType)

    vi.mocked(fetchGiftSubscriptions).mockResolvedValue({
      hasGifts: true,
      giftCount: 4,
      giftMessage: 'You have 4 gift subscriptions',
    })

    render(<SubscriptionStatus />)

    await waitFor(() => {
      expect(screen.getByText(/All users have free Pro access until/)).toBeInTheDocument()
      expect(screen.getByText('You have 4 gift subscriptions')).toBeInTheDocument()
    })
  })

  it('does not fetch gift info when user has a gift subscription', async () => {
    const mockSubscription: SubscriptionRow = {
      id: '1',
      userId: 'user-1',
      stripeCustomerId: 'cus_123',
      stripePriceId: 'price_123',
      stripeSubscriptionId: 'sub_123',
      tier: SubscriptionTier.PRO,
      status: SubStatus.ACTIVE,
      currentPeriodEnd: new Date(),
      cancelAtPeriodEnd: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      transactionType: TransactionType.RECURRING,
      isGift: true,
    }

    vi.mocked(useSubscriptionContext).mockReturnValue({
      subscription: mockSubscription,
      isLoading: false,
      inGracePeriod: false,
      hasActivePlan: true,
      isLifetimePlan: false,
      isPro: true,
      isFree: false,
    } as MockSubscriptionContextType)

    render(<SubscriptionStatus />)

    // We need to check this immediately, not in waitFor
    expect(fetchGiftSubscriptions).not.toHaveBeenCalled()
  })

  it('handles error when fetching gift subscriptions', async () => {
    const mockSubscription: SubscriptionRow = {
      id: '1',
      userId: 'user-1',
      stripeCustomerId: 'cus_123',
      stripePriceId: 'price_123',
      stripeSubscriptionId: 'sub_123',
      tier: SubscriptionTier.PRO,
      status: SubStatus.ACTIVE,
      currentPeriodEnd: new Date(),
      cancelAtPeriodEnd: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      transactionType: TransactionType.RECURRING,
      isGift: false,
    }

    vi.mocked(useSubscriptionContext).mockReturnValue({
      subscription: mockSubscription,
      isLoading: false,
      inGracePeriod: false,
      hasActivePlan: true,
      isLifetimePlan: false,
      isPro: true,
      isFree: false,
    } as MockSubscriptionContextType)

    // Mock console.error to prevent test output noise
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    vi.mocked(fetchGiftSubscriptions).mockRejectedValue(new Error('Failed to fetch'))

    render(<SubscriptionStatus />)

    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error fetching gift information:',
        expect.any(Error),
      )
    })

    consoleErrorSpy.mockRestore()
  })

  it('displays appropriate subtitle for gift subscription', async () => {
    const mockSubscription: SubscriptionRow = {
      id: '1',
      userId: 'user-1',
      stripeCustomerId: 'cus_123',
      stripePriceId: null,
      stripeSubscriptionId: null,
      tier: SubscriptionTier.PRO,
      status: SubStatus.ACTIVE,
      currentPeriodEnd: new Date(),
      cancelAtPeriodEnd: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      transactionType: TransactionType.RECURRING,
      isGift: true,
    }

    vi.mocked(useSubscriptionContext).mockReturnValue({
      subscription: mockSubscription,
      isLoading: false,
      inGracePeriod: false,
      hasActivePlan: true,
      isLifetimePlan: false,
      isPro: true,
      isFree: false,
    } as MockSubscriptionContextType)

    vi.mocked(getGiftSubscriptionInfo).mockReturnValue({
      message: 'Gift subscription message',
      isGift: true,
    })

    render(<SubscriptionStatus showAlert={false} />)

    await waitFor(() => {
      expect(screen.getByText(/You have a gift subscription to the Pro plan/)).toBeInTheDocument()
    })
  })

  it('displays appropriate subtitle for lifetime gift subscription', async () => {
    const mockSubscription: SubscriptionRow = {
      id: '1',
      userId: 'user-1',
      stripeCustomerId: 'cus_123',
      stripePriceId: null,
      stripeSubscriptionId: null,
      tier: SubscriptionTier.PRO,
      status: SubStatus.ACTIVE,
      currentPeriodEnd: new Date(),
      cancelAtPeriodEnd: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      transactionType: TransactionType.LIFETIME,
      isGift: true,
    }

    vi.mocked(useSubscriptionContext).mockReturnValue({
      subscription: mockSubscription,
      isLoading: false,
      inGracePeriod: false,
      hasActivePlan: true,
      isLifetimePlan: true,
      isPro: true,
      isFree: false,
    } as MockSubscriptionContextType)

    vi.mocked(getGiftSubscriptionInfo).mockReturnValue({
      message: 'Gift subscription message',
      isGift: true,
    })

    render(<SubscriptionStatus showAlert={false} />)

    await waitFor(() => {
      expect(
        screen.getByText(/You have lifetime access to the Pro plan thanks to a generous gift/),
      ).toBeInTheDocument()
    })
  })

  it('displays appropriate subtitle for lifetime subscription', async () => {
    const mockSubscription: SubscriptionRow = {
      id: '1',
      userId: 'user-1',
      stripeCustomerId: 'cus_123',
      stripePriceId: null,
      stripeSubscriptionId: null,
      tier: SubscriptionTier.PRO,
      status: SubStatus.ACTIVE,
      currentPeriodEnd: new Date(),
      cancelAtPeriodEnd: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      transactionType: TransactionType.LIFETIME,
      isGift: false,
    }

    vi.mocked(useSubscriptionContext).mockReturnValue({
      subscription: mockSubscription,
      isLoading: false,
      inGracePeriod: false,
      hasActivePlan: true,
      isLifetimePlan: true,
      isPro: true,
      isFree: false,
    } as MockSubscriptionContextType)

    render(<SubscriptionStatus showAlert={false} />)

    await waitFor(() => {
      expect(screen.getByText(/You have lifetime access to the Pro plan/)).toBeInTheDocument()
    })
  })

  it('displays appropriate subtitle for paid subscription with gifts', async () => {
    const mockSubscription: SubscriptionRow = {
      id: '1',
      userId: 'user-1',
      stripeCustomerId: 'cus_123',
      stripePriceId: 'price_123',
      stripeSubscriptionId: 'sub_123',
      tier: SubscriptionTier.PRO,
      status: SubStatus.ACTIVE,
      currentPeriodEnd: new Date(),
      cancelAtPeriodEnd: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      transactionType: TransactionType.RECURRING,
      isGift: false,
    }

    vi.mocked(useSubscriptionContext).mockReturnValue({
      subscription: mockSubscription,
      isLoading: false,
      inGracePeriod: false,
      hasActivePlan: true,
      isLifetimePlan: false,
      isPro: true,
      isFree: false,
    } as MockSubscriptionContextType)

    vi.mocked(fetchGiftSubscriptions).mockResolvedValue({
      hasGifts: true,
      giftCount: 2,
      giftMessage: 'You have 2 gift subscriptions',
    })

    render(<SubscriptionStatus showAlert={false} />)

    await waitFor(() => {
      expect(
        screen.getByText(/You are on the Pro plan \(.*\) with additional gift subscription\(s\)/),
      ).toBeInTheDocument()
    })
  })

  it('displays appropriate subtitle for only gift subscriptions without paid subscription', async () => {
    vi.mocked(useSubscriptionContext).mockReturnValue({
      subscription: null,
      isLoading: false,
      inGracePeriod: false,
      hasActivePlan: false,
      isLifetimePlan: false,
      isPro: true,
      isFree: false,
    } as MockSubscriptionContextType)

    vi.mocked(fetchGiftSubscriptions).mockResolvedValue({
      hasGifts: true,
      giftCount: 4,
      giftMessage: 'You have 4 gift subscriptions',
    })

    render(<SubscriptionStatus showAlert={false} />)

    await waitFor(() => {
      expect(
        screen.getByText(/You have 4 gift subscription\(s\) to the Pro plan/),
      ).toBeInTheDocument()
    })
  })

  it('displays appropriate subtitle for grace period without paid subscription', async () => {
    vi.mocked(useSubscriptionContext).mockReturnValue({
      subscription: null,
      isLoading: false,
      inGracePeriod: true,
      hasActivePlan: false,
      isLifetimePlan: false,
      isPro: true,
      isFree: false,
    } as MockSubscriptionContextType)

    render(<SubscriptionStatus showAlert={false} />)

    await waitFor(() => {
      expect(
        screen.getByText(/Subscribe to Pro to continue using Dotabod Pro features/),
      ).toBeInTheDocument()
    })
  })

  it('displays default subtitle when no other conditions match', async () => {
    vi.mocked(useSubscriptionContext).mockReturnValue({
      subscription: null,
      isLoading: false,
      inGracePeriod: false,
      hasActivePlan: false,
      isLifetimePlan: false,
      isPro: false,
      isFree: true,
    } as MockSubscriptionContextType)

    render(<SubscriptionStatus showAlert={false} />)

    await waitFor(() => {
      expect(screen.getByText(/Manage your subscription and billing settings/)).toBeInTheDocument()
    })
  })
})
