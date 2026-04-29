import { fireEvent, render, screen } from '@testing-library/react'
import type React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import OBSOverlay from '@/components/Dashboard/OBSOverlay'

const routerReplaceMock = vi.fn()
const useFeatureAccessMock = vi.fn()

vi.mock('next/image', () => ({
  default: ({ alt, src, ...props }: { alt: string; src: string }) => (
    <img alt={alt} src={src} {...props} />
  ),
}))

vi.mock('next/link', () => ({
  default: ({
    children,
    href,
    className,
    target,
    onClick,
  }: React.PropsWithChildren<{
    href: string
    className?: string
    target?: string
    onClick?: () => void
  }>) => (
    <a className={className} href={href} onClick={onClick} target={target}>
      {children}
    </a>
  ),
}))

vi.mock('next/router', () => ({
  useRouter: () => ({
    pathname: '/dashboard',
    query: {},
    replace: routerReplaceMock,
  }),
}))

vi.mock('next-auth/react', () => ({
  useSession: () => ({
    data: {
      user: {
        id: 'user-123',
      },
    },
  }),
}))

vi.mock('@mantine/core', () => ({
  CopyButton: ({
    children,
    value,
  }: {
    children: (props: { copied: boolean; copy: () => void }) => React.ReactNode
    value: string
  }) => <div data-copy-value={value}>{children({ copied: false, copy: vi.fn() })}</div>,
}))

vi.mock('antd', () => ({
  Button: ({
    children,
    onClick,
    type,
    className,
  }: React.PropsWithChildren<{ onClick?: () => void; type?: string; className?: string }>) => (
    <button className={className} data-type={type} onClick={onClick} type='button'>
      {children}
    </button>
  ),
  Tag: ({ children }: React.PropsWithChildren) => <span>{children}</span>,
}))

vi.mock('@/hooks/useSubscription', () => ({
  useFeatureAccess: (feature: string) => useFeatureAccessMock(feature),
}))

vi.mock('@/lib/hooks/useBaseUrl', () => ({
  useBaseUrl: (path: string) => `https://dotabod.test/${path}`,
}))

vi.mock('@/lib/track', () => ({
  useTrack: () => vi.fn(),
}))

vi.mock('@/ui/card', () => ({
  Card: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
}))

vi.mock('@/components/Dashboard/ObsSetup', () => ({
  ObsSetup: () => <div>OBS auto setup component</div>,
}))

vi.mock('@/components/Dashboard/RegionalBlockingNote', () => ({
  default: () => <div>Regional note</div>,
}))

describe('OBSOverlay setup UX', () => {
  beforeEach(() => {
    routerReplaceMock.mockReset()
    useFeatureAccessMock.mockReset()
  })

  it('shows automatic OBS as a Pro preview for free users', () => {
    const onProgressChange = vi.fn()

    useFeatureAccessMock.mockReturnValue({
      hasAccess: false,
      requiredTier: 'PRO',
    })

    render(<OBSOverlay onProgressChange={onProgressChange} />)

    expect(screen.getByText('Automatic setup is available on Pro')).toBeInTheDocument()
    expect(screen.getByText('See Pro plans')).toBeInTheDocument()
    expect(screen.queryByText('OBS auto setup component')).not.toBeInTheDocument()
    expect(onProgressChange).toHaveBeenCalledWith(
      expect.objectContaining({
        label: 'Automatic OBS setup is part of Pro',
      }),
    )
  })

  it('keeps manual OBS setup visible and easy to switch to', () => {
    useFeatureAccessMock.mockReturnValue({
      hasAccess: false,
      requiredTier: 'PRO',
    })

    render(<OBSOverlay />)

    fireEvent.click(screen.getByRole('button', { name: /manual setup/i }))

    expect(
      screen.getByText(/you're viewing the manual overlay path right now/i),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /manual steps/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /video walkthrough/i })).toBeInTheDocument()
  })

  it('shows the OBS auto setup component for Pro users', () => {
    useFeatureAccessMock.mockReturnValue({
      hasAccess: true,
      requiredTier: 'PRO',
    })

    render(<OBSOverlay />)

    expect(screen.getByText('OBS auto setup component')).toBeInTheDocument()
    expect(screen.queryByText('Automatic setup is available on Pro')).not.toBeInTheDocument()
  })
})
