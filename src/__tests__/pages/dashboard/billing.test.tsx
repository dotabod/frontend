// @ts-nocheck
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { useSession } from 'next-auth/react'
import { beforeEach, describe, expect, it, vi } from 'vite-plus/test'
import BillingPage from '@/pages/dashboard/billing'

const { messageMock } = vi.hoisted(() => ({
  messageMock: {
    error: vi.fn(),
    info: vi.fn(),
  },
}))

// Mock the dependencies
vi.mock('next-auth/react', () => ({
  useSession: vi.fn(),
}))

vi.mock('next/head', () => ({
  default: ({ children }) => <>{children}</>,
}))

vi.mock('@/utils/subscription', () => ({
  getSubscriptionStatusInfo: vi.fn().mockReturnValue({
    badge: 'gold',
    message: 'Renews on April 20, 2026',
    type: 'success',
  }),
}))

vi.mock('@/lib/server/dashboardAccess', () => ({
  requireDashboardAccess: () => async () => ({ props: {} }),
}))

vi.mock('@/components/Billing/BillingPlans', () => ({
  BillingPlans: () => <div data-testid='billing-plans'>Billing Plans</div>,
}))

vi.mock('@/components/Billing/BillingOverview', () => ({
  BillingOverview: ({ onOpenPortal }) => (
    <div data-testid='billing-overview'>
      <button onClick={onOpenPortal} type='button'>
        Open billing portal
      </button>
    </div>
  ),
}))

vi.mock('@/components/Billing/PaymentStatusAlert', () => ({
  PaymentStatusAlert: () => <div data-testid='payment-status-alert'>Payment status alert</div>,
}))

vi.mock('@/components/Subscription/SubscriptionAlerts', () => ({
  SubscriptionAlerts: ({ hideManageButton }) => (
    <div data-testid='subscription-alerts'>hideManageButton:{String(hideManageButton)}</div>
  ),
}))

vi.mock('@/components/Dashboard/Header', () => ({
  default: ({ title, subtitle }) => (
    <div>
      <h1>{title}</h1>
      <p>{subtitle}</p>
    </div>
  ),
}))

vi.mock('@/components/Dashboard/DashboardShell', () => ({
  default: ({ children }) => <div data-testid='dashboard-shell'>{children}</div>,
}))

vi.mock('antd', () => ({
  Typography: {
    Title: ({ children }) => <h1>{children}</h1>,
  },
  message: messageMock,
}))

vi.mock('@/contexts/SubscriptionContext', () => ({
  useSubscriptionContext: () => ({
    creditBalance: 0,
    formattedCreditBalance: '$0.00',
    hasActivePlan: true,
    inGracePeriod: false,
    isLifetimePlan: false,
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

describe('Dashboard Billing Page', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    global.fetch = vi.fn()

    vi.mocked(useSession).mockReturnValue({
      data: {
        expires: '1',
        user: {
          email: 'test@example.com',
          id: 'user-123',
          image: 'https://example.com/avatar.png',
          isImpersonating: false,
          locale: 'en',
          name: 'Test User',
          role: 'user',
          scope: '',
          twitchId: '',
        },
      },
      status: 'authenticated',
      update: vi.fn(),
    })
  })

  it('renders the overview first and demotes plan selection below it', () => {
    render(<BillingPage />)

    expect(screen.getByRole('heading', { name: 'Billing' })).toBeInTheDocument()
    expect(screen.getByText(/your current plan, renewal date/i)).toBeInTheDocument()
    expect(screen.getByTestId('billing-overview')).toBeInTheDocument()
    expect(screen.getByTestId('subscription-alerts')).toHaveTextContent('hideManageButton:true')
    expect(screen.getByRole('heading', { name: 'Compare plans' })).toBeInTheDocument()
    expect(screen.getByTestId('billing-plans')).toBeInTheDocument()
  })

  it('shows inline guidance toast when no Stripe customer portal can be opened', async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      json: async () => ({
        code: 'NO_STRIPE_CUSTOMER',
        guidance: 'No active Stripe billing profile found.',
      }),
      ok: false,
    } as Response)

    render(<BillingPage />)

    fireEvent.click(screen.getByRole('button', { name: /open billing portal/i }))

    await waitFor(() => {
      expect(messageMock.info).toHaveBeenCalledWith('No active Stripe billing profile found.')
    })
  })
})
