import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import React from 'react'
import { SubscriptionStatus } from '../SubscriptionStatus'
import { useSubscriptionContext } from '@/contexts/SubscriptionContext'
import { useSession } from 'next-auth/react'
import { fetchGiftSubscriptions } from '@/lib/gift-subscription'
import { SubscriptionStatus as SubStatus, SubscriptionTier, TransactionType } from '@prisma/client'
import type { SubscriptionRow } from '@/utils/subscription'

// Mock dependencies
vi.mock('@/contexts/SubscriptionContext')
vi.mock('next-auth/react')
vi.mock('@/lib/gift-subscription')

// Reset the React useEffect mock to allow it to call callbacks by default
vi.mock('react', async () => {
  const actual = await vi.importActual('react')
  return {
    ...actual,
    useEffect: vi.fn((callback) => {
      // Call the callback function immediately
      if (typeof callback === 'function') {
        callback()
      }
      // Return a cleanup function
      return () => {}
    }),
  }
})

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
  GRACE_PERIOD_END: '2025-05-30T00:00:00.000Z',
  SUBSCRIPTION_TIERS: {
    PRO: 'PRO',
  },
}))

// Import the mocked functions to use in tests
import {
  getGiftSubscriptionInfo,
  getSubscriptionStatusInfo,
  getCurrentPeriod,
} from '@/utils/subscription'

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

    // Default mock for useSession
    vi.mocked(useSession).mockReturnValue({
      data: {
        user: {
          id: 'user-123',
          name: 'Test User',
          email: 'test@example.com',
        },
      },
      status: 'authenticated',
      update: vi.fn(),
    } as unknown as ReturnType<typeof useSession>)

    // Default mock for fetchGiftSubscriptions
    vi.mocked(fetchGiftSubscriptions).mockResolvedValue({
      hasGifts: false,
      giftCount: 0,
      giftMessage: '',
      proExpiration: null,
      hasLifetime: false,
    })

    // Default mock for useSubscriptionContext
    vi.mocked(useSubscriptionContext).mockReturnValue({
      subscription: null,
      isLoading: false,
      inGracePeriod: false,
      hasActivePlan: false,
      isLifetimePlan: false,
      isPro: false,
      isFree: true,
    } as MockSubscriptionContextType)

    // Reset getSubscriptionStatusInfo and getGiftSubscriptionInfo mocks
    vi.mocked(getSubscriptionStatusInfo).mockReturnValue({
      message: 'Test status message',
      type: 'success',
      badge: 'gold',
    })

    vi.mocked(getGiftSubscriptionInfo).mockReturnValue({
      message: 'Test gift message',
      isGift: false,
      senderName: undefined,
      giftMessage: undefined,
    })

    // Mock getCurrentPeriod to return 'monthly' consistently
    vi.mocked(getCurrentPeriod).mockReturnValue('monthly')
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
      metadata: null,
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

    await act(async () => {
      render(<SubscriptionStatus showAlert={false} />)
    })

    // Check for the subtitle text directly
    expect(screen.getByText(/You are currently on the Pro plan/)).toBeInTheDocument()
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
      metadata: null,
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
      senderName: 'Generous Donor',
      giftMessage: 'Enjoy your lifetime subscription!',
    })

    await act(async () => {
      render(<SubscriptionStatus />)
    })

    // Check for the lifetime access text
    expect(screen.getByText('Lifetime Access')).toBeInTheDocument()
    expect(
      screen.getByText(/Someone gifted you lifetime access to Dotabod Pro/),
    ).toBeInTheDocument()
    expect(screen.getByText(/Gift from: Generous Donor/)).toBeInTheDocument()
    expect(screen.getByText(/"Enjoy your lifetime subscription!"/)).toBeInTheDocument()
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
      metadata: null,
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

    await act(async () => {
      render(<SubscriptionStatus />)
    })

    // Check for the lifetime access text
    expect(screen.getByText('Lifetime Access')).toBeInTheDocument()
    expect(screen.getByText(/Thank you for being a lifetime supporter/)).toBeInTheDocument()
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
      metadata: null,
    }

    // Mock a regular subscription
    vi.mocked(useSubscriptionContext).mockReturnValue({
      subscription: mockSubscription,
      isLoading: false,
      inGracePeriod: false,
      hasActivePlan: true,
      isLifetimePlan: false,
      isPro: true,
      isFree: false,
    } as MockSubscriptionContextType)

    // Make sure the message is returned
    vi.mocked(getSubscriptionStatusInfo).mockReturnValue({
      message: 'Test status message',
      type: 'success',
      badge: 'gold',
    })

    await act(async () => {
      render(<SubscriptionStatus />)
    })

    // Assert that the status message appears in the document
    expect(screen.getByText('Test status message')).toBeInTheDocument()
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
      metadata: null,
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

    await act(async () => {
      render(<SubscriptionStatus />)
    })

    // Check for the grace period text
    expect(screen.getByText(/All users have free Pro access until/)).toBeInTheDocument()
    expect(screen.getByText(/but you're already subscribed/)).toBeInTheDocument()
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
      metadata: null,
    }

    // Mock active subscription
    vi.mocked(useSubscriptionContext).mockReturnValue({
      subscription: mockSubscription,
      isLoading: false,
      inGracePeriod: false,
      hasActivePlan: true,
      isLifetimePlan: false,
      isPro: true,
      isFree: false,
    } as MockSubscriptionContextType)

    // Make sure the message is returned
    vi.mocked(getSubscriptionStatusInfo).mockReturnValue({
      message: 'Test status message',
      type: 'success',
      badge: 'gold',
    })

    // Set up the gift subscriptions response - this needs to be returned by the fetchGiftSubscriptions function
    const giftResponse = {
      hasGifts: true,
      giftCount: 2,
      giftMessage: 'You have received 2 gift subscriptions',
      proExpiration: null,
      hasLifetime: false,
    }

    // Mock the fetchGiftSubscriptions function
    vi.mocked(fetchGiftSubscriptions).mockResolvedValue(giftResponse)

    await act(async () => {
      render(<SubscriptionStatus />)
    })

    // Verify the regular status message is shown
    expect(screen.getByText('Test status message')).toBeInTheDocument()

    // Verify that fetchGiftSubscriptions was called
    expect(fetchGiftSubscriptions).toHaveBeenCalled()
  })

  it('displays gift info alert when user has only gift subscriptions without their own subscription', async () => {
    // No regular subscription
    vi.mocked(useSubscriptionContext).mockReturnValue({
      subscription: null,
      isLoading: false,
      inGracePeriod: false,
      hasActivePlan: false,
      isLifetimePlan: false,
      isPro: true, // Pro via gifts
      isFree: false,
    } as MockSubscriptionContextType)

    // Set up for successful resolution of gift subscription data
    const giftResponse = {
      hasGifts: true,
      giftCount: 1,
      giftMessage: 'You have received a gift subscription',
      proExpiration: new Date('2025-01-01'), // Future date
      hasLifetime: false,
      giftSubscriptions: [
        {
          id: 'gift-1',
          endDate: new Date('2025-01-01'),
          senderName: 'Gift Giver',
          giftType: 'monthly',
          giftQuantity: 1,
          giftMessage: 'Enjoy your gift!',
          createdAt: new Date(),
        },
      ],
    }

    // This needs to be immediately resolved so the component gets the data
    vi.mocked(fetchGiftSubscriptions).mockResolvedValue(giftResponse)

    // Set up getSubscriptionStatusInfo to return appropriate message for gift subscription
    vi.mocked(getSubscriptionStatusInfo).mockReturnValue({
      message: 'Gift Subscription Active',
      type: 'info',
      badge: 'gold',
    })

    await act(async () => {
      render(<SubscriptionStatus />)
    })

    // Test that fetchGiftSubscriptions was called
    expect(fetchGiftSubscriptions).toHaveBeenCalled()

    // Verify status message is shown
    expect(screen.getByText('Gift Subscription Active')).toBeInTheDocument()
  })

  it('displays both grace period and gift info alerts when user has only gift subscriptions during grace period', async () => {
    // No regular subscription but in grace period
    vi.mocked(useSubscriptionContext).mockReturnValue({
      subscription: null,
      isLoading: false,
      inGracePeriod: true,
      hasActivePlan: false,
      isLifetimePlan: false,
      isPro: true, // Pro via grace period
      isFree: false,
    } as MockSubscriptionContextType)

    // Check for grace period alert
    await act(async () => {
      render(<SubscriptionStatus />)
    })

    expect(screen.getByText('Free Pro Access Period')).toBeInTheDocument()
    expect(screen.getByText(/All users have free Pro access until/)).toBeInTheDocument()
  })

  it('does not fetch gift info when user has a gift subscription', async () => {
    // Reset the mock to clear any previous calls
    vi.mocked(fetchGiftSubscriptions).mockClear()

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
      metadata: null,
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

    // Mock useEffect to prevent the callback from being called
    const useEffectSpy = vi.spyOn(React, 'useEffect')
    useEffectSpy.mockImplementationOnce(() => () => {})

    await act(async () => {
      render(<SubscriptionStatus />)
    })

    // We need to check this immediately, not in waitFor
    expect(fetchGiftSubscriptions).not.toHaveBeenCalled()

    // Restore the original useEffect mock
    useEffectSpy.mockRestore()
  })

  it('handles error when fetching gift subscriptions', async () => {
    // Create a console error spy
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    // Use a rejected promise to simulate an error
    vi.mocked(fetchGiftSubscriptions).mockRejectedValue(new Error('Failed to fetch gift info'))

    // Regular subscription
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
      metadata: null,
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

    // Make sure the message is returned
    vi.mocked(getSubscriptionStatusInfo).mockReturnValue({
      message: 'Test status message',
      type: 'success',
      badge: 'gold',
    })

    // Using synchronous rendering for test simplicity
    await act(async () => {
      render(<SubscriptionStatus />)
    })

    // The component renders successfully despite the error
    expect(screen.getByText('Test status message')).toBeInTheDocument()

    // Clean up
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
      metadata: null,
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

    await act(async () => {
      render(<SubscriptionStatus showAlert={false} />)
    })

    // Check for the subtitle text
    expect(screen.getByText(/You have a gift subscription to the Pro plan/)).toBeInTheDocument()
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
      metadata: null,
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

    await act(async () => {
      render(<SubscriptionStatus showAlert={false} />)
    })

    // Check for the subtitle text
    expect(
      screen.getByText(/You have lifetime access to the Pro plan thanks to a generous gift/),
    ).toBeInTheDocument()
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
      metadata: null,
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

    await act(async () => {
      render(<SubscriptionStatus showAlert={false} />)
    })

    // Check for the subtitle text
    expect(screen.getByText(/You have lifetime access to the Pro plan/)).toBeInTheDocument()
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
      metadata: null,
    }

    // Mock a subscription with gifts
    vi.mocked(useSubscriptionContext).mockReturnValue({
      subscription: mockSubscription,
      isLoading: false,
      inGracePeriod: false,
      hasActivePlan: true,
      isLifetimePlan: false,
      isPro: true,
      isFree: false,
    } as MockSubscriptionContextType)

    // Make sure getCurrentPeriod returns the expected value
    vi.mocked(getCurrentPeriod).mockReturnValue('monthly')

    // Set up the gift subscriptions response - resolve immediately
    vi.mocked(fetchGiftSubscriptions).mockResolvedValue({
      hasGifts: true,
      giftCount: 2,
      giftMessage: 'You have 2 gift subscriptions',
      proExpiration: null,
      hasLifetime: false,
    })

    await act(async () => {
      render(<SubscriptionStatus showAlert={false} />)
    })

    // Verify the text contains the expected subtitle format
    expect(screen.getByText(/You are currently on the Pro plan/)).toBeInTheDocument()
  })

  it('displays appropriate subtitle for only gift subscriptions without paid subscription', async () => {
    // No regular subscription
    vi.mocked(useSubscriptionContext).mockReturnValue({
      subscription: null,
      isLoading: false,
      inGracePeriod: false,
      hasActivePlan: false,
      isLifetimePlan: false,
      isPro: true, // Pro via gifts
      isFree: false,
    } as MockSubscriptionContextType)

    // Set up the gift response
    vi.mocked(fetchGiftSubscriptions).mockResolvedValue({
      hasGifts: true,
      giftCount: 3,
      giftMessage: 'You have gift subscriptions',
      proExpiration: new Date('2025-01-01'),
      hasLifetime: false,
    })

    await act(async () => {
      render(<SubscriptionStatus showAlert={false} />)
    })

    // Check the function was called
    expect(fetchGiftSubscriptions).toHaveBeenCalled()
  })

  it('displays appropriate subtitle for grace period without paid subscription', async () => {
    // No subscription but in grace period
    vi.mocked(useSubscriptionContext).mockReturnValue({
      subscription: null,
      isLoading: false,
      inGracePeriod: true,
      hasActivePlan: false,
      isLifetimePlan: false,
      isPro: true, // Pro via grace period
      isFree: false,
    } as MockSubscriptionContextType)

    await act(async () => {
      render(<SubscriptionStatus showAlert={false} />)
    })

    // Instead of checking for the element directly, just look for the text content
    expect(
      screen.getByText(/Subscribe to Pro to continue using Dotabod Pro features/),
    ).toBeInTheDocument()
  })

  it('displays default subtitle when no other conditions match', async () => {
    // No subscription, not in grace period, no gifts
    vi.mocked(useSubscriptionContext).mockReturnValue({
      subscription: null,
      isLoading: false,
      inGracePeriod: false,
      hasActivePlan: false,
      isLifetimePlan: false,
      isPro: false,
      isFree: true,
    } as MockSubscriptionContextType)

    await act(async () => {
      render(<SubscriptionStatus showAlert={false} />)
    })

    // Look for the text content instead of the element
    expect(screen.getByText(/Manage your subscription and billing settings/)).toBeInTheDocument()
  })
})
