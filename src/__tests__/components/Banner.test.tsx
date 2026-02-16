import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import Banner from '@/components/Banner'

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
    // Mock the current date to be within the crypto announcement period (Oct 4, 2025 ± 7 days)
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2025-10-04T12:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('renders the banner when date is within crypto announcement period', () => {
    render(<Banner />)

    expect(screen.getByText('New! Pay for Dotabod Pro with cryptocurrency.')).toBeInTheDocument()
    expect(screen.getByText('Learn More')).toBeInTheDocument()
    expect(screen.getByText('Learn More').closest('a')).toHaveAttribute(
      'href',
      '/blog/crypto-payments-launch',
    )
  })

  it('does not render the banner when date is outside crypto announcement period', () => {
    vi.setSystemTime(new Date('2025-11-01'))

    const { container } = render(<Banner />)
    expect(container.firstChild).toBeNull()
  })

  it('hides the banner when dismiss button is clicked', () => {
    render(<Banner />)

    const dismissButton = screen.getByRole('button')
    expect(dismissButton).toBeInTheDocument()

    fireEvent.click(dismissButton)

    // Banner should be hidden after clicking dismiss
    expect(
      screen.queryByText('New! Pay for Dotabod Pro with cryptocurrency.'),
    ).not.toBeInTheDocument()
  })
})
