import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vite-plus/test'
import { SubscriptionAlerts } from '@/components/Subscription/SubscriptionAlerts'

const useSubscriptionContextMock = vi.fn()

vi.mock('@/contexts/SubscriptionContext', () => ({
  useSubscriptionContext: () => useSubscriptionContextMock(),
}))

vi.mock('antd', () => ({
  Alert: ({
    message,
    description,
    action,
  }: {
    message: React.ReactNode
    description: React.ReactNode
    action: React.ReactNode
  }) => (
    <div>
      <div>{message}</div>
      <div>{description}</div>
      <div>{action}</div>
    </div>
  ),
  Button: ({
    children,
    onClick,
    disabled,
  }: {
    children: React.ReactNode
    onClick?: () => void
    disabled?: boolean
  }) => (
    <button type='button' onClick={onClick} disabled={disabled}>
      {children}
    </button>
  ),
  Skeleton: {
    Input: () => <div data-testid='skeleton' />,
  },
  message: {
    error: vi.fn(),
    loading: vi.fn(),
    success: vi.fn(),
  },
}))

describe('SubscriptionAlerts', () => {
  const giftInfo = {
    giftCount: 0,
    giftMessage: '',
    hasGifts: false,
    hasLifetime: false,
  }

  it('shows credit guidance when a member has credit and no active plan', () => {
    useSubscriptionContextMock.mockReturnValue({
      creditBalance: 5000,
      formattedCreditBalance: '$50.00',
      hasActivePlan: false,
      inGracePeriod: false,
      isLifetimePlan: false,
      isLoading: false,
      subscription: {
        cancelAtPeriodEnd: false,
        currentPeriodEnd: new Date('2026-04-01T00:00:00.000Z'),
        status: 'CANCELED',
        stripeCustomerId: null,
        stripeSubscriptionId: null,
      },
    })

    render(
      <SubscriptionAlerts
        giftInfo={giftInfo}
        statusInfo={null}
        handlePortalAccess={vi.fn()}
        isLoading={false}
      />,
    )

    expect(screen.getByText(/credit balance available/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /apply credits now/i })).toBeInTheDocument()
  })

  it('shows Update Payment action for PAST_DUE with Stripe customer and no stripeSubscriptionId', () => {
    useSubscriptionContextMock.mockReturnValue({
      creditBalance: 0,
      formattedCreditBalance: '$0.00',
      hasActivePlan: false,
      inGracePeriod: false,
      isLifetimePlan: false,
      isLoading: false,
      subscription: {
        cancelAtPeriodEnd: false,
        currentPeriodEnd: new Date('2026-04-01T00:00:00.000Z'),
        status: 'PAST_DUE',
        stripeCustomerId: 'cus_123',
        stripeSubscriptionId: null,
      },
    })

    render(
      <SubscriptionAlerts
        giftInfo={giftInfo}
        statusInfo={{
          badge: 'red',
          message: 'Payment failed - update payment method to avoid cancellation',
          type: 'error',
        }}
        handlePortalAccess={vi.fn()}
        isLoading={false}
      />,
    )

    expect(screen.getByRole('button', { name: /update payment/i })).toBeInTheDocument()
  })

  it('shows Renew Now when a subscription is ending soon and actions are enabled', () => {
    useSubscriptionContextMock.mockReturnValue({
      creditBalance: 0,
      formattedCreditBalance: '$0.00',
      hasActivePlan: true,
      inGracePeriod: false,
      isLifetimePlan: false,
      isLoading: false,
      subscription: {
        cancelAtPeriodEnd: true,
        currentPeriodEnd: new Date('2026-04-01T00:00:00.000Z'),
        isGift: false,
        status: 'ACTIVE',
        stripeCustomerId: 'cus_123',
        stripeSubscriptionId: 'sub_123',
      },
    })

    render(
      <SubscriptionAlerts
        giftInfo={giftInfo}
        statusInfo={{
          badge: 'red',
          message: 'Ending in 4 days',
          type: 'warning',
        }}
        handlePortalAccess={vi.fn()}
        isLoading={false}
      />,
    )

    expect(screen.getByRole('button', { name: /renew now/i })).toBeInTheDocument()
  })
})
