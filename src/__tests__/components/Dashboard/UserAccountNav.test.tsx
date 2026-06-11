// @ts-nocheck
import { render, screen } from '@testing-library/react'
import { useRouter } from 'next/router'
import { useSession } from 'next-auth/react'
import useSWR from 'swr'
import { beforeEach, describe, expect, it, vi } from 'vite-plus/test'
import { createMockRouter, createMockSWR } from '@/__tests__/utils/mockFactories'
import { UserAccountNav } from '@/components/UserAccountNav'

vi.mock('next-auth/react', () => ({
  signOut: vi.fn(),
  useSession: vi.fn(),
}))

vi.mock('next/router', () => ({
  useRouter: vi.fn(),
}))

vi.mock('swr', () => ({
  default: vi.fn(),
}))

vi.mock('next/image', () => ({
  default: ({ alt, src }) => <img alt={alt} src={typeof src === 'string' ? src : ''} />,
}))

vi.mock('next/link', () => ({
  default: ({ href, children, prefetch: _prefetch, ...rest }) => (
    <a href={typeof href === 'string' ? href : '#'} {...rest}>
      {children}
    </a>
  ),
}))

vi.mock('@ant-design/icons', () => ({
  BellOutlined: () => <span data-testid='bell' />,
}))

// The avatar dropdown is closed by default in real antd; render its items eagerly
// so we can assert the admin/impersonator matrix without opening a portal.
vi.mock('antd', () => ({
  Badge: ({ children }) => <div>{children}</div>,
  Button: ({ children }) => <button type='button'>{children}</button>,
  Dropdown: ({ menu, children }) => (
    <div>
      {children}
      <ul data-testid='account-menu'>
        {(menu?.items ?? [])
          .filter((item) => item && item.type !== 'divider')
          .map((item) => (
            <li key={item.key}>{item.label}</li>
          ))}
      </ul>
    </div>
  ),
  Empty: () => <div />,
  Popover: ({ children }) => <div>{children}</div>,
  Skeleton: { Avatar: () => <div />, Input: () => <div /> },
  Space: ({ children }) => <div>{children}</div>,
  Tabs: () => <div />,
  Tag: ({ children }) => <span>{children}</span>,
}))

const sessionFor = ({ role, isImpersonating }: { role?: string; isImpersonating?: boolean }) => ({
  data: {
    expires: '1',
    user: {
      email: 'test@example.com',
      id: 'user-123',
      image: 'https://example.com/avatar.png',
      isImpersonating,
      name: 'Test User',
      role,
    },
  },
  status: 'authenticated',
  update: vi.fn(),
})

const renderFor = (opts: { role?: string; isImpersonating?: boolean }) => {
  vi.mocked(useSession).mockReturnValue(sessionFor(opts))
  return render(<UserAccountNav />)
}

describe('UserAccountNav avatar dropdown', () => {
  beforeEach(() => {
    vi.mocked(useRouter).mockReturnValue(createMockRouter())
    vi.mocked(useSWR).mockReturnValue(createMockSWR())
  })

  it('always offers Dashboard, Gift Pro, and Logout', () => {
    for (const opts of [
      { isImpersonating: false, role: 'admin' },
      { isImpersonating: false, role: 'user' },
      { isImpersonating: true, role: 'admin' },
      { isImpersonating: true, role: 'user' },
    ]) {
      const { unmount } = renderFor(opts)
      expect(screen.getByText('Dashboard')).toBeInTheDocument()
      expect(screen.getByText('Gift Pro')).toBeInTheDocument()
      expect(screen.getByText('Logout')).toBeInTheDocument()
      unmount()
    }
  })

  it('shows Billing + Your data for a normal (non-impersonating) session', () => {
    renderFor({ isImpersonating: false, role: 'user' })
    expect(screen.getByText('Billing')).toBeInTheDocument()
    expect(screen.getByText('Your data')).toBeInTheDocument()
  })

  it('shows Billing + Your data for admins too (admin does not gate the dropdown)', () => {
    renderFor({ isImpersonating: false, role: 'admin' })
    expect(screen.getByText('Billing')).toBeInTheDocument()
    expect(screen.getByText('Your data')).toBeInTheDocument()
  })

  it('hides Billing + Your data while impersonating, regardless of role', () => {
    for (const role of ['admin', 'user']) {
      const { unmount } = renderFor({ isImpersonating: true, role })
      expect(screen.queryByText('Billing')).not.toBeInTheDocument()
      expect(screen.queryByText('Your data')).not.toBeInTheDocument()
      // Gift Pro is never gated.
      expect(screen.getByText('Gift Pro')).toBeInTheDocument()
      unmount()
    }
  })
})
