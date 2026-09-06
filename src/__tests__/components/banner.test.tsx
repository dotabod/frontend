import { fireEvent, render, screen } from '@testing-library/react'
import useSWR from 'swr'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import Banner from '@/components/banner'

vi.mock('swr', () => ({
  default: vi.fn(),
}))

// Mock next/link
vi.mock('next/link', () => ({
  default: ({
    children,
    href,
    ...props
  }: React.PropsWithChildren<{ href: string } & React.AnchorHTMLAttributes<HTMLAnchorElement>>) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}))

const mockUseSWR = vi.mocked(useSWR)

const mockPost = function mockPost(
  post: { slug: string; title: string; description: string; date: string } | null,
) {
  mockUseSWR.mockReturnValue({
    data: { post },
    error: undefined,
    isLoading: false,
    isValidating: false,
    mutate: vi.fn(),
  })
}

describe(Banner, () => {
  const freshPost = {
    date: '2025-10-02T12:00:00Z',
    description: 'NOWPayments support',
    slug: 'crypto-payments-launch',
    title: 'Pay with crypto',
  }

  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-09-04T12:00:00Z'))

    const store: Record<string, string> = {}
    vi.stubGlobal('localStorage', {
      clear: vi.fn(() => {
        for (const key of Object.keys(store)) {
          delete store[key]
        }
      }),
      getItem: vi.fn((key: string) => store[key] ?? null),
      removeItem: vi.fn((key: string) => {
        delete store[key]
      }),
      setItem: vi.fn((key: string, value: string) => {
        store[key] = value
      }),
    })
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it("promotes the newest What's New entry when there is no fresher blog post", () => {
    mockPost(null)
    render(<Banner whatsNewPath='/dashboard/whats-new' />)

    const banner = screen.getByRole('complementary', { name: 'Latest Dotabod update' })
    expect(screen.getByText(/New in Dotabod/u)).toBeInTheDocument()
    expect(screen.getByText(/Keep your win\/loss counter across streams/u)).toBeInTheDocument()
    expect(banner).toHaveClass('overflow-hidden', 'bg-gray-800', 'px-6')
    expect(banner.querySelectorAll('.blur-2xl')).toHaveLength(2)
    expect(screen.getByRole('link', { name: /See what's new/u })).toHaveAttribute(
      'href',
      '/dashboard/whats-new#custom-wl-stats-window',
    )
    expect(screen.getByRole('link', { name: /See what's new/u })).toHaveClass('text-teal-300')
  })

  it('uses the public changelog path outside the dashboard', () => {
    mockPost(null)
    render(<Banner />)

    expect(screen.getByRole('link', { name: /See what's new/u })).toHaveAttribute(
      'href',
      '/whats-new#custom-wl-stats-window',
    )
  })

  it('keeps a newer fresh blog post as the announcement', () => {
    mockPost({ ...freshPost, date: '2026-09-04T08:00:00Z' })
    render(<Banner />)

    expect(screen.getByText(/Fresh on the blog/u)).toBeInTheDocument()
    expect(screen.getByText(/Pay with crypto/u)).toBeInTheDocument()
    expect(screen.getByText('Read it').closest('a')).toHaveAttribute(
      'href',
      '/blog/crypto-payments-launch',
    )
  })

  it('hides the banner when the dismiss button is clicked', () => {
    mockPost(null)
    render(<Banner />)

    const dismissButton = screen.getByRole('button')
    expect(dismissButton).toBeInTheDocument()

    fireEvent.click(dismissButton)

    expect(screen.queryByText(/New in Dotabod/u)).not.toBeInTheDocument()
    expect(localStorage.setItem).toHaveBeenCalledWith(
      'dotabod-banner-dismissed-slug',
      'whats-new:custom-wl-stats-window',
    )
  })
})
