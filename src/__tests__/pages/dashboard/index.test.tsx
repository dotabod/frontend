import { render, screen } from '@testing-library/react'
import { useRouter } from 'next/router'
import { useSession } from 'next-auth/react'
import useSWR from 'swr'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import SetupPage from '@/pages/dashboard/index'

// Mock the dependencies
vi.mock('next-auth/react', () => ({
  useSession: vi.fn(),
}))

vi.mock('next/router', () => ({
  useRouter: vi.fn(),
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

vi.mock('@/lib/server/dashboardAccess', () => ({
  requireDashboardAccess: vi.fn(() => async () => ({ props: {} })),
}))

// Mock environment variables
vi.mock('@/utils/env', () => ({
  env: {
    NEXT_PUBLIC_STRIPE_PRO_MONTHLY_PRICE_ID: 'price_monthly_123',
    NEXT_PUBLIC_STRIPE_PRO_ANNUAL_PRICE_ID: 'price_annual_123',
    NEXT_PUBLIC_STRIPE_PRO_LIFETIME_PRICE_ID: 'price_lifetime_123',
    STRIPE_WEBHOOK_SECRET: 'whsec_test_secret',
  },
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

vi.mock('@/components/Dashboard/DashboardShell', () => ({
  default: ({ children }) => <div data-testid='dashboard-shell'>{children}</div>,
}))

// Mock components that might cause issues
vi.mock('@/components/Dashboard/ChatBot', () => ({
  default: () => <div data-testid='chat-bot'>Chat Bot</div>,
}))

vi.mock('@/components/Dashboard/ExportCFG', () => ({
  default: () => <div data-testid='export-cfg'>Export CFG</div>,
}))

vi.mock('@/components/Dashboard/OBSOverlay', () => ({
  default: () => <div data-testid='obs-overlay'>OBS Overlay</div>,
}))

vi.mock('@/components/Dashboard/Header', () => ({
  default: () => <div data-testid='dashboard-header'>Dashboard Header</div>,
}))

// Mock App from antd
vi.mock('antd', () => {
  return {
    App: {
      useApp: () => ({
        message: {
          success: vi.fn(),
          error: vi.fn(),
        },
        notification: {
          success: vi.fn(),
          error: vi.fn(),
        },
      }),
    },
    Alert: ({ children }) => <div>{children}</div>,
    Button: ({ children }) => <button type='button'>{children}</button>,
    Collapse: ({ children }) => <div>{children}</div>,
    Steps: ({ children }) => <div>{children}</div>,
    Typography: {
      Title: ({ children }) => <h1>{children}</h1>,
      Text: ({ children }) => <span>{children}</span>,
      Paragraph: ({ children }) => <p>{children}</p>,
    },
    Progress: () => <div>Progress</div>,
    Tag: ({ children, ...props }) => <span {...props}>{children}</span>,
  }
})

// Mock canvas-confetti
vi.mock('canvas-confetti', () => ({
  default: vi.fn(),
}))

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

describe('Dashboard Index Page', () => {
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

    // Mock useRouter
    vi.mocked(useRouter).mockReturnValue({
      query: {},
      pathname: '/dashboard',
      replace: vi.fn(),
      route: '',
      asPath: '',
      basePath: '',
      isLocaleDomain: false,
      push: vi.fn(),
      reload: vi.fn(),
      back: vi.fn(),
      prefetch: vi.fn(),
      beforePopState: vi.fn(),
      events: {
        on: vi.fn(),
        off: vi.fn(),
        emit: vi.fn(),
      },
      isFallback: false,
      isReady: true,
      isPreview: false,
      forward: vi.fn(),
    } as any)

    // Mock useSWR
    vi.mocked(useSWR).mockReturnValue({
      data: { stream_online: false },
      error: null,
      isLoading: false,
      isValidating: false,
      mutate: vi.fn(),
    } as any)
  })

  it('renders the dashboard page', () => {
    render(<SetupPage />)
    expect(screen.getByTestId('dashboard-header')).toBeInTheDocument()
    expect(screen.getByTestId('chat-bot')).toBeInTheDocument()
  })
})
