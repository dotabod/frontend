import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { SubscriptionAlerts } from '@/components/Subscription/SubscriptionAlerts'

const useSubscriptionContextMock = vi.fn()

vi.mock('@/contexts/SubscriptionContext', () => ({
  useSubscriptionContext: () => useSubscriptionContextMock(),
}))

vi.mock('antd', () => ({
  Alert: ({ message, description, action }) => (
    <div>
      <div>{message}</div>
      <div>{description}</div>
      <div>{action}</div>
    </div>
  ),
  Button: ({ children, onClick, disabled }) => (
    <button onClick={onClick} disabled={disabled}>
      {children}
    </button>
  ),
  Skeleton: {
    Input: () => <div data-testid='skeleton' />,
  },
  message: {
    loading: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
  },
}))

describe('SubscriptionAlerts', () => {
  const giftInfo = {
    hasGifts: false,
    giftCount: 0,
    giftMessage: '',
    hasLifetime: false,
  }

  it('shows Manage subscription when Stripe customer exists without stripeSubscriptionId', () => {
    useSubscriptionContextMock.mockReturnValue({
      subscription: {
        status: 'TRIALING',
        stripeCustomerId: 'cus_123',
        stripeSubscriptionId: null,
        currentPeriodEnd: new Date('2026-04-01T00:00:00.000Z'),
        cancelAtPeriodEnd: false,
      },
      isLifetimePlan: false,
      inGracePeriod: false,
      hasActivePlan: false,
      creditBalance: 0,
      formattedCreditBalance: '$0.00',
      isLoading: false,
    })

    render(
      <SubscriptionAlerts
        giftInfo={giftInfo}
        statusInfo={{
          message: 'Trial access until Apr 1, 2026',
          type: 'info',
          badge: 'gold',
        }}
        handlePortalAccess={vi.fn()}
        isLoading={false}
      />,
    )

    expect(screen.getByRole('button', { name: /manage subscription/i })).toBeInTheDocument()
  })

  it('shows Update Payment action for PAST_DUE with Stripe customer and no stripeSubscriptionId', () => {
    useSubscriptionContextMock.mockReturnValue({
      subscription: {
        status: 'PAST_DUE',
        stripeCustomerId: 'cus_123',
        stripeSubscriptionId: null,
        currentPeriodEnd: new Date('2026-04-01T00:00:00.000Z'),
        cancelAtPeriodEnd: false,
      },
      isLifetimePlan: false,
      inGracePeriod: false,
      hasActivePlan: false,
      creditBalance: 0,
      formattedCreditBalance: '$0.00',
      isLoading: false,
    })

    render(
      <SubscriptionAlerts
        giftInfo={giftInfo}
        statusInfo={{
          message: 'Payment failed - update payment method to avoid cancellation',
          type: 'error',
          badge: 'red',
        }}
        handlePortalAccess={vi.fn()}
        isLoading={false}
      />,
    )

    expect(screen.getByRole('button', { name: /update payment/i })).toBeInTheDocument()
  })
})
