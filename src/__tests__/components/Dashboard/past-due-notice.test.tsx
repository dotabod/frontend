import type { SubscriptionStatus } from '@prisma/client'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { PastDueNotice } from '@/components/Dashboard/past-due-notice'
import type { SubscriptionRow } from '@/utils/subscription'

const withStatus = (status: SubscriptionStatus): SubscriptionRow => ({
  cancelAtPeriodEnd: false,
  createdAt: new Date('2026-10-01T00:00:00.000Z'),
  currentPeriodEnd: new Date('2026-11-01T00:00:00.000Z'),
  id: 'sub_test',
  isGift: false,
  metadata: {},
  status,
  stripeCustomerId: 'cus_test',
  stripePriceId: 'price_monthly',
  stripeSubscriptionId: 'sub_stripe_test',
  tier: 'PRO',
  transactionType: 'RECURRING',
  updatedAt: new Date('2026-11-01T00:00:00.000Z'),
  userId: 'user_test',
})

describe(PastDueNotice, () => {
  it('links a past-due member to billing from the dashboard', () => {
    render(<PastDueNotice pathname='/dashboard' subscription={withStatus('PAST_DUE')} />)

    expect(screen.getByRole('alert')).toHaveTextContent('Your Pro payment failed')
    expect(screen.getByRole('link')).toHaveAttribute('href', '/dashboard/billing')
  })

  it('stays hidden on the billing page, which has its own notice', () => {
    const { container } = render(
      <PastDueNotice pathname='/dashboard/billing' subscription={withStatus('PAST_DUE')} />,
    )

    expect(container).toBeEmptyDOMElement()
  })

  it.each<SubscriptionStatus>(['ACTIVE', 'TRIALING', 'CANCELED'])(
    'stays hidden for status %s',
    (status) => {
      const { container } = render(
        <PastDueNotice pathname='/dashboard' subscription={withStatus(status)} />,
      )

      expect(container).toBeEmptyDOMElement()
    },
  )

  it('stays hidden without a subscription', () => {
    const { container } = render(<PastDueNotice pathname='/dashboard' subscription={null} />)

    expect(container).toBeEmptyDOMElement()
  })
})
