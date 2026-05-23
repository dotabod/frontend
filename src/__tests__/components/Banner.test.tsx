import { fireEvent, render, screen } from '@testing-library/react'
import useSWR from 'swr'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test'
import Banner from '@/components/Banner'

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

function mockPost(post: { slug: string; title: string; description: string; date: string } | null) {
  mockUseSWR.mockReturnValue({
    data: { post },
    error: undefined,
    isLoading: false,
    isValidating: false,
    mutate: vi.fn(),
  } as unknown as ReturnType<typeof useSWR>)
}

describe('Banner', () => {
  const freshPost = {
    slug: 'crypto-payments-launch',
    title: 'Pay with crypto',
    description: 'NOWPayments support',
    // 2 days before the mocked system time, so it is within the 14-day freshness window
    date: '2025-10-02T12:00:00Z',
  }

  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2025-10-04T12:00:00Z'))

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

  it('renders the banner when the latest post is fresh', () => {
    mockPost(freshPost)
    render(<Banner />)

    expect(screen.getByText(/Fresh on the blog/)).toBeInTheDocument()
    expect(screen.getByText(/Pay with crypto/)).toBeInTheDocument()
    expect(screen.getByText('Read it').closest('a')).toHaveAttribute(
      'href',
      '/blog/crypto-payments-launch',
    )
  })

  it('does not render the banner when there is no post', () => {
    mockPost(null)
    const { container } = render(<Banner />)
    expect(container.firstChild).toBeNull()
  })

  it('does not render the banner when the post is stale', () => {
    mockPost({ ...freshPost, date: '2025-09-01T12:00:00Z' })
    const { container } = render(<Banner />)
    expect(container.firstChild).toBeNull()
  })

  it('hides the banner when the dismiss button is clicked', () => {
    mockPost(freshPost)
    render(<Banner />)

    const dismissButton = screen.getByRole('button')
    expect(dismissButton).toBeInTheDocument()

    fireEvent.click(dismissButton)

    expect(screen.queryByText(/Fresh on the blog/)).not.toBeInTheDocument()
    expect(localStorage.setItem).toHaveBeenCalledWith(
      'dotabod-banner-dismissed-slug',
      'crypto-payments-launch',
    )
  })
})
