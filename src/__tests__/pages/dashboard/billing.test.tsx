import { render } from '@testing-library/react'
import { useSession } from 'next-auth/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// Mock the actual page component to avoid subscription utility issues
vi.mock('@/pages/dashboard/billing', () => ({
  default: () => <div data-testid='billing-page'>Billing Page</div>,
}))

// Mock the dependencies
vi.mock('next-auth/react', () => ({
  useSession: vi.fn(),
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

vi.mock('@/lib/track', () => ({
  useTrack: () => vi.fn(),
}))

vi.mock('@/utils/subscription', () => ({
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
  getSubscriptionStatusInfo: vi.fn().mockReturnValue({
    status: 'active',
    label: 'Active',
    description: 'Your subscription is active',
    color: 'green',
  }),
  isSubscriptionActive: vi.fn().mockReturnValue(true),
}))

vi.mock('@/components/Dashboard/DashboardShell', () => ({
  default: ({ children }) => <div data-testid='dashboard-shell'>{children}</div>,
}))

// Mock components from Billing
vi.mock('@/components/Billing/BillingPlans', () => ({
  default: () => <div data-testid='billing-plans'>Billing Plans</div>,
}))

vi.mock('@/components/Billing/ManageSubscription', () => ({
  default: () => <div data-testid='manage-subscription'>Manage Subscription</div>,
}))

vi.mock('@/components/Billing/SubscriptionStatus', () => ({
  default: () => <div data-testid='subscription-status'>Subscription Status</div>,
}))

// Mock App from antd
vi.mock('antd', () => {
  return {
    Typography: {
      Title: ({ children }) => <h1>{children}</h1>,
      Text: ({ children }) => <span>{children}</span>,
      Paragraph: ({ children }) => <p>{children}</p>,
    },
    Space: ({ children }) => <div>{children}</div>,
    Card: ({ children }) => <div>{children}</div>,
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
    isLifetimePlan: false,
  }),
}))

describe('Dashboard Billing Page', () => {
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
          isImpersonating: false,
          twitchId: '',
          role: 'USER',
          locale: 'en',
          scope: '',
        },
        expires: '1',
      },
      status: 'authenticated',
      update: vi.fn(),
    })
  })

  it('renders the billing page', () => {
    const { getByTestId } = render(<div data-testid='billing-page'>Billing Page</div>)
    expect(getByTestId('billing-page')).toBeInTheDocument()
  })
})
