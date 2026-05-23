// @ts-nocheck
import { render, screen } from '@testing-library/react'
import { useRouter } from 'next/router'
import { useSession } from 'next-auth/react'
import useSWR from 'swr'
import { beforeEach, describe, expect, it, vi } from 'vite-plus/test'
import { createMockRouter, createMockSession, createMockSWR } from '@/__tests__/utils/mockFactories'
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
    NEXT_PUBLIC_STRIPE_PRO_ANNUAL_PRICE_ID: 'price_annual_123',
    NEXT_PUBLIC_STRIPE_PRO_LIFETIME_PRICE_ID: 'price_lifetime_123',
    NEXT_PUBLIC_STRIPE_PRO_MONTHLY_PRICE_ID: 'price_monthly_123',
    STRIPE_WEBHOOK_SECRET: 'whsec_test_secret',
  },
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
  getRequiredTier: vi.fn().mockReturnValue('FREE'),
  isInGracePeriod: vi.fn().mockReturnValue(false),
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
vi.mock('antd', () => ({
  Alert: ({ children }) => <div>{children}</div>,
  App: {
    useApp: () => ({
      message: {
        error: vi.fn(),
        success: vi.fn(),
      },
      notification: {
        error: vi.fn(),
        success: vi.fn(),
      },
    }),
  },
  Button: ({ children }) => <button type='button'>{children}</button>,
  Collapse: ({ children }) => <div>{children}</div>,
  Progress: () => <div>Progress</div>,
  Steps: ({ children }) => <div>{children}</div>,
  Tag: ({ children, ...props }) => <span {...props}>{children}</span>,
  Typography: {
    Paragraph: ({ children }) => <p>{children}</p>,
    Text: ({ children }) => <span>{children}</span>,
    Title: ({ children }) => <h1>{children}</h1>,
  },
}))

// Mock canvas-confetti
vi.mock('canvas-confetti', () => ({
  default: vi.fn(),
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

describe('Dashboard Index Page', () => {
  beforeEach(() => {
    vi.resetAllMocks()

    // Mock useSession
    vi.mocked(useSession).mockReturnValue(createMockSession())

    // Mock useRouter
    vi.mocked(useRouter).mockReturnValue(createMockRouter())

    // Mock useSWR
    vi.mocked(useSWR).mockReturnValue(createMockSWR())
  })

  it('renders the dashboard page', () => {
    render(<SetupPage />)
    expect(screen.getByTestId('dashboard-header')).toBeInTheDocument()
    expect(screen.getByTestId('chat-bot')).toBeInTheDocument()
  })
})
