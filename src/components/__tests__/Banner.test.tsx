import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import Banner from '../Banner'

// Mock the GRACE_PERIOD_END constant
vi.mock('@/utils/subscription', () => ({
  GRACE_PERIOD_END: new Date('2025-04-30'),
}))

// Mock next/link
vi.mock('next/link', () => ({
  default: ({
    children,
    href,
    ...props
  }: React.PropsWithChildren<{ href: string; [key: string]: any }>) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}))

describe('Banner', () => {
  beforeEach(() => {
    // Mock the current date to be before the grace period end
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2025-01-01'))
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('renders the banner when date is before grace period end', () => {
    render(<Banner />)

    expect(screen.getByText('New Pricing Plans Coming April 30.')).toBeInTheDocument()
    expect(screen.getByText('Learn More')).toBeInTheDocument()
    expect(screen.getByText('Learn More').closest('a')).toHaveAttribute(
      'href',
      '/blog/new-pricing-tiers',
    )
  })

  it('does not render the banner when date is after grace period end', () => {
    vi.setSystemTime(new Date('2025-05-01'))

    const { container } = render(<Banner />)
    expect(container.firstChild).toBeNull()
  })

  it('hides the banner when dismiss button is clicked', () => {
    render(<Banner />)

    const dismissButton = screen.getByRole('button')
    expect(dismissButton).toBeInTheDocument()

    fireEvent.click(dismissButton)

    // Banner should be hidden after clicking dismiss
    expect(screen.queryByText('New Pricing Plans Coming April 30.')).not.toBeInTheDocument()
  })
})
