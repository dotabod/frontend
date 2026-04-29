import { act, fireEvent, render, screen } from '@testing-library/react'
import type React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { LockedFeatureOverlay } from '@/components/Dashboard/Features/LockedFeatureOverlay'
import { TierBadge } from '@/components/Dashboard/Features/TierBadge'

const useSubscriptionMock = vi.fn()

vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    className,
  }: React.PropsWithChildren<{ href: string; className?: string }>) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}))

vi.mock('antd', async () => {
  const ReactModule = await import('react')

  return {
    Button: ({
      children,
      className,
      ...props
    }: React.PropsWithChildren<React.ButtonHTMLAttributes<HTMLButtonElement>>) => (
      <button type='button' className={className} {...props}>
        {children}
      </button>
    ),
    Popover: ({
      children,
      content,
      open,
    }: React.PropsWithChildren<{ content: React.ReactElement; open?: boolean }>) => (
      <div>
        {children}
        {open
          ? ReactModule.cloneElement(content as React.ReactElement<{ 'data-testid'?: string }>, {
              'data-testid': 'upgrade-popover-surface',
            })
          : null}
      </div>
    ),
  }
})

vi.mock('@/hooks/useSubscription', () => ({
  useSubscription: () => useSubscriptionMock(),
}))

vi.mock('@/utils/subscription', () => ({
  SUBSCRIPTION_TIERS: {
    FREE: 'FREE',
    PRO: 'PRO',
  },
  getRequiredTier: vi.fn(() => 'PRO'),
  isSubscriptionActive: vi.fn((subscription) => subscription?.status === 'ACTIVE'),
}))

describe('TierBadge', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    useSubscriptionMock.mockReturnValue({
      subscription: {
        status: 'INACTIVE',
      },
    })
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  it('opens a premium upgrade popover and keeps it open while moving into the surface', () => {
    render(<TierBadge requiredTier={'PRO' as never} />)

    const trigger = screen.getByRole('button', { name: /unlock pro features/i })

    fireEvent.mouseEnter(trigger)

    expect(screen.getByText('Unlock Pro for your stream')).toBeInTheDocument()

    fireEvent.mouseLeave(trigger)

    act(() => {
      vi.advanceTimersByTime(100)
    })

    expect(screen.getByText('Unlock Pro for your stream')).toBeInTheDocument()

    const popoverSurface = screen.getByTestId('upgrade-popover-surface')

    fireEvent.mouseEnter(popoverSurface)

    act(() => {
      vi.advanceTimersByTime(220)
    })

    expect(screen.getByText('Unlock Pro for your stream')).toBeInTheDocument()

    fireEvent.mouseLeave(popoverSurface)

    act(() => {
      vi.advanceTimersByTime(220)
    })

    expect(screen.queryByText('Unlock Pro for your stream')).not.toBeInTheDocument()
  })

  it('links the upgrade CTA to billing', () => {
    render(<TierBadge requiredTier={'PRO' as never} />)

    fireEvent.click(screen.getByRole('button', { name: /unlock pro features/i }))

    const billingLink = screen.getByText('See Pro plans').closest('a')

    expect(billingLink).toHaveAttribute('href', '/dashboard/billing')
  })

  it('renders a static badge without an interactive trigger for active subscribers', () => {
    useSubscriptionMock.mockReturnValue({
      subscription: {
        status: 'ACTIVE',
      },
    })

    render(<TierBadge requiredTier={'PRO' as never} />)

    expect(screen.queryByRole('button', { name: /unlock pro features/i })).not.toBeInTheDocument()
    expect(screen.getByText('pro')).toBeInTheDocument()
  })
})

describe('LockedFeatureOverlay', () => {
  beforeEach(() => {
    useSubscriptionMock.mockReturnValue({
      subscription: {
        status: 'INACTIVE',
      },
    })
  })

  it('reuses the premium upgrade CTA treatment', () => {
    render(<LockedFeatureOverlay requiredTier={'PRO' as never} />)

    expect(screen.getByText('This feature is part of Dotabod Pro.')).toBeInTheDocument()
    expect(screen.getByText('Unlock Pro for your stream')).toBeInTheDocument()
    expect(screen.getByText('See Pro plans').closest('a')).toHaveAttribute(
      'href',
      '/dashboard/billing',
    )
  })
})
