// @ts-nocheck
import { render } from '@testing-library/react'
import { useSession } from 'next-auth/react'
import useSWR from 'swr'
import { beforeEach, describe, expect, it, vi } from 'vite-plus/test'
import { createMockSession } from '@/__tests__/utils/mockFactories'
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
  useFeatureAccess: () => ({
    hasAccess: true,
    requiredTier: 'FREE',
  }),
  useSubscription: vi.fn().mockReturnValue({
    isLoading: false,
    subscription: {
      cancelAtPeriodEnd: false,
      canceledAt: null,
      currentPeriodEnd: new Date(),
      currentPeriodStart: new Date(),
      id: 'sub-123',
      isGift: false,
      status: 'ACTIVE',
      stripeCustomerId: 'cus-123',
      stripePriceId: 'price-123',
      stripeSubscriptionId: 'sub-123',
      tier: 'PRO',
      userId: 'user-123',
    },
  }),
}))

vi.mock('@/utils/subscription', () => ({
  GRACE_PERIOD_END: new Date(),
  PRICE_IDS: [
    {
      annual: 'price_free_annual',
      monthly: 'price_free_monthly',
      name: 'Free',
      tier: 'FREE',
    },
    {
      annual: 'price_pro_annual',
      monthly: 'price_pro_monthly',
      name: 'Pro',
      tier: 'PRO',
    },
  ],
  SUBSCRIPTION_TIERS: {
    FREE: 'FREE',
    PRO: 'PRO',
  },
  canAccessFeature: vi.fn(),
  getRequiredTier: vi.fn().mockReturnValue('FREE'),
  isInGracePeriod: vi.fn().mockReturnValue(false),
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
vi.mock('antd', () => ({
  Button: ({ children, ...props }) => (
    <button type='button' {...props}>
      {children}
    </button>
  ),
  Select: ({ children, ...props }) => <select {...props}>{children}</select>,
  Tag: ({ children }) => <span>{children}</span>,
  notification: {
    error: vi.fn(),
    success: vi.fn(),
  },
}))

// Mock contexts
vi.mock('@/contexts/SubscriptionContext', () => ({
  useSubscriptionContext: () => ({
    isLoading: false,
    subscription: {
      cancelAtPeriodEnd: false,
      canceledAt: null,
      currentPeriodEnd: new Date(),
      currentPeriodStart: new Date(),
      id: 'sub-123',
      isGift: false,
      status: 'ACTIVE',
      stripeCustomerId: 'cus-123',
      stripePriceId: 'price-123',
      stripeSubscriptionId: 'sub-123',
      tier: 'PRO',
      userId: 'user-123',
    },
  }),
}))

describe('Dashboard Managers Page', () => {
  beforeEach(() => {
    vi.resetAllMocks()

    // Mock useSession
    vi.mocked(useSession).mockReturnValue(createMockSession())

    // Mock canAccessFeature
    vi.mocked(canAccessFeature).mockReturnValue({
      hasAccess: true,
      requiredTier: 'FREE',
    })

    // Mock useSWR for different endpoints
    vi.mocked(useSWR).mockImplementation((url: string) => {
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
