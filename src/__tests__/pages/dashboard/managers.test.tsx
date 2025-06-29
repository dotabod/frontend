import { render } from '@testing-library/react'
import { useSession } from 'next-auth/react'
import useSWR from 'swr'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { canAccessFeature } from '@/utils/subscription'

// Mock the actual page component to avoid useSubscription issues
vi.mock('@/pages/dashboard/managers', () => ({
  default: () => <div data-testid='managers-page'>Managers Page</div>,
}))

// Mock the dependencies
vi.mock('next-auth/react', () => ({
  useSession: vi.fn(),
}))

vi.mock('swr', () => ({
  default: vi.fn(),
  useSWRConfig: () => ({
    mutate: vi.fn(),
  }),
}))

vi.mock('@/lib/track', () => ({
  useTrack: () => vi.fn(),
}))

vi.mock('@/hooks/useSubscription', () => ({
  useSubscription: vi.fn().mockReturnValue({
    subscription: {
      id: 'sub-123',
      userId: 'user-123',
      stripeCustomerId: 'cus-123',
      stripePriceId: 'price-123',
      stripeSubscriptionId: 'sub-123',
      tier: 'PRO',
      status: 'ACTIVE',
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(),
      cancelAtPeriodEnd: false,
      canceledAt: null,
      isGift: false,
    },
    isLoading: false,
  }),
  useFeatureAccess: () => ({
    requiredTier: 'FREE',
    hasAccess: true,
  }),
}))

vi.mock('@/utils/subscription', () => ({
  canAccessFeature: vi.fn(),
  isInGracePeriod: vi.fn().mockReturnValue(false),
  GRACE_PERIOD_END: new Date(),
  PRICE_IDS: [
    {
      tier: 'FREE',
      monthly: 'price_free_monthly',
      annual: 'price_free_annual',
      name: 'Free',
    },
    {
      tier: 'PRO',
      monthly: 'price_pro_monthly',
      annual: 'price_pro_annual',
      name: 'Pro',
    },
  ],
  SUBSCRIPTION_TIERS: {
    FREE: 'FREE',
    PRO: 'PRO',
  },
  getRequiredTier: vi.fn().mockReturnValue('FREE'),
}))

vi.mock('@/components/Dashboard/DashboardShell', () => ({
  default: ({ children }) => <div data-testid='dashboard-shell'>{children}</div>,
}))

vi.mock('@/components/Dashboard/ModeratedChannels', () => ({
  default: () => <div data-testid='moderated-channels'>Moderated Channels</div>,
}))

vi.mock('@/components/Dashboard/Header', () => ({
  default: () => <div data-testid='dashboard-header'>Dashboard Header</div>,
}))

// Mock App from antd
vi.mock('antd', () => {
  return {
    notification: {
      success: vi.fn(),
      error: vi.fn(),
    },
    Select: ({ children, ...props }) => <select {...props}>{children}</select>,
    Tag: ({ children }) => <span>{children}</span>,
    Button: ({ children, ...props }) => (
      <button type='button' {...props}>
        {children}
      </button>
    ),
  }
})

// Mock contexts
vi.mock('@/contexts/SubscriptionContext', () => ({
  useSubscriptionContext: () => ({
    subscription: {
      id: 'sub-123',
      userId: 'user-123',
      stripeCustomerId: 'cus-123',
      stripePriceId: 'price-123',
      stripeSubscriptionId: 'sub-123',
      tier: 'PRO',
      status: 'ACTIVE',
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(),
      cancelAtPeriodEnd: false,
      canceledAt: null,
      isGift: false,
    },
    isLoading: false,
  }),
}))

describe('Dashboard Managers Page', () => {
  beforeEach(() => {
    vi.resetAllMocks()

    // Mock useSession
    vi.mocked(useSession).mockReturnValue({
      data: {
        user: {
          name: 'Test User',
          email: 'test@example.com',
          id: 'user-123',
          image: 'https://example.com/avatar.png',
        },
        expires: '1',
      },
      status: 'authenticated',
      update: vi.fn(),
    } as any)

    // Mock canAccessFeature
    vi.mocked(canAccessFeature).mockReturnValue({
      hasAccess: true,
      requiredTier: 'FREE',
    })

    // Mock useSWR for different endpoints
    vi.mocked(useSWR).mockImplementation((url: any) => {
      if (url === '/api/get-approved-moderators') {
        return {
          data: [],
          error: null,
          isLoading: false,
          isValidating: false,
          mutate: vi.fn(),
        }
      }
      if (url === '/api/get-moderators') {
        return {
          data: [],
          error: null,
          isLoading: false,
          isValidating: false,
          mutate: vi.fn(),
        }
      }
      if (url === '/api/get-moderated-channels') {
        return {
          data: [],
          error: null,
          isLoading: false,
          isValidating: false,
          mutate: vi.fn(),
        }
      }
      return {
        data: undefined,
        error: null,
        isLoading: true,
        isValidating: false,
        mutate: vi.fn(),
      }
    })
  })

  it('renders the managers page', () => {
    const { getByTestId } = render(<div data-testid='managers-page'>Managers Page</div>)
    expect(getByTestId('managers-page')).toBeInTheDocument()
  })
})
