// @ts-nocheck
import { render, screen } from '@testing-library/react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/router'
import useSWR from 'swr'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import DashboardShell from '@/components/Dashboard/dashboard-shell'

vi.mock('next-auth/react', () => ({
  useSession: vi.fn(),
}))

vi.mock('next/router', () => ({
  useRouter: vi.fn(),
}))

vi.mock('swr', () => ({
  default: vi.fn(),
}))

vi.mock('next/head', () => ({
  default: ({ children }) => children,
}))

vi.mock('next/link', () => ({
  default: ({ children, href, prefetch: _prefetch, ...props }) => (
    <a href={typeof href === 'string' ? href : '#'} {...props}>
      {children}
    </a>
  ),
}))

vi.mock('@sentry/nextjs', () => ({
  captureException: vi.fn(),
}))

vi.mock('@mantine/core', () => ({
  CopyButton: ({ children }) => children({ copied: false, copy: vi.fn() }),
}))

vi.mock('antd', () => {
  const Component = ({ children, ...props }) => <div {...props}>{children}</div>
  const Layout = Component
  Layout.Content = Component
  Layout.Header = Component
  Layout.Sider = function ({
    children,
    collapsed: _collapsed,
    collapsible: _collapsible,
    ...props
  }) {
    return <aside {...props}>{children}</aside>
  }

  const renderItems = (items = []) => (
    <ul>
      {items.filter(Boolean).map((item) => (
        <li key={item.key}>
          {item.label}
          {item.children ? renderItems(item.children) : null}
        </li>
      ))}
    </ul>
  )

  return {
    Button: ({ children, icon, ...props }) => (
      <button type='button' {...props}>
        {icon}
        {children}
      </button>
    ),
    Drawer: ({ children, open, ...props }) => (open ? <div {...props}>{children}</div> : null),
    Layout,
    Menu: ({ items }) => renderItems(items),
    Tag: ({ children, color: _color, ...props }) => <span {...props}>{children}</span>,
    theme: { useToken: () => ({ token: { colorBgLayout: 'rgb(31, 41, 55)' } }) },
  }
})

vi.mock('@/components/banner', () => ({ default: () => <div>Announcement</div> }))
vi.mock('@/components/cookie-consent', () => ({ default: () => null }))
vi.mock('@/components/Dashboard/disable-toggle', () => ({
  DisableToggle: () => <div>Toggle</div>,
}))
vi.mock('@/components/Dashboard/subscription-badge', () => ({
  SubscriptionBadge: () => <div>Subscription</div>,
}))
vi.mock('@/components/hub-spot', () => ({ default: () => null }))
vi.mock('@/components/logo', () => ({
  DarkLogo: (props) => <svg aria-label='Dotabod' {...props} />,
}))
vi.mock('@/components/Subscription/gift-notification', () => ({ default: () => null }))
vi.mock('@/components/user-account-nav', () => ({ UserAccountNav: () => <div>Account</div> }))
vi.mock('@/hooks/use-subscription', () => ({
  useFeatureAccess: () => ({ hasAccess: false }),
}))
vi.mock('@/lib/hooks/use-base-url', () => ({
  useBaseUrl: () => 'https://example.com/overlay',
}))
vi.mock('@/lib/hooks/use-maybe-signout', () => ({ default: () => {} }))
vi.mock('@/components/Dashboard/help-menu', () => ({ HelpMenu: () => <div>Help</div> }))
vi.mock('@/components/Dashboard/settings-search', () => ({
  SettingsSearch: () => <div>Search</div>,
}))

describe('DashboardShell responsive navigation', () => {
  beforeEach(() => {
    vi.mocked(useRouter).mockReturnValue({
      asPath: '/dashboard/features',
      pathname: '/dashboard/features',
    })
    vi.mocked(useSession).mockReturnValue({
      data: {
        user: {
          id: 'user-123',
          isImpersonating: false,
          role: 'user',
        },
      },
      status: 'authenticated',
    })
    vi.mocked(useSWR).mockReturnValue({ data: null, mutate: vi.fn() })
    global.fetch = vi.fn().mockResolvedValue({ ok: true })
  })

  it('keeps utility navigation visible while the primary links scroll independently', () => {
    render(
      <DashboardShell>
        <main>Dashboard content</main>
      </DashboardShell>,
    )

    expect(screen.getByTestId('dashboard-viewport')).toHaveClass('h-dvh', 'overflow-hidden')
    expect(screen.getByTestId('dashboard-content-scroll')).toHaveClass('min-h-0', 'overflow-y-auto')

    const navigation = screen.getByRole('navigation', { name: 'Dashboard' })
    expect(navigation).toHaveClass('min-h-0', 'overflow-hidden')
    expect(screen.getByTestId('dashboard-primary-navigation')).toHaveClass(
      'min-h-0',
      'flex-1',
      'overflow-y-auto',
    )
    expect(screen.getByTestId('dashboard-utility-navigation')).toHaveClass('shrink-0')
    expect(screen.getByRole('link', { name: 'Team access' })).toBeVisible()
    expect(screen.getByRole('link', { name: 'Help center' })).toBeVisible()
  })

  it('renders the short Diagnostics label with a readable New tag', () => {
    render(
      <DashboardShell>
        <main>Dashboard content</main>
      </DashboardShell>,
    )

    const diagnosticsLink = screen.getByRole('link', {
      name: 'Diagnostics New',
    })

    expect(diagnosticsLink).toHaveClass('min-w-0', 'w-full')
    expect(diagnosticsLink.firstElementChild).toHaveClass('min-w-0', 'truncate')
    expect(screen.getByText('New')).toHaveClass('shrink-0')
  })
})
