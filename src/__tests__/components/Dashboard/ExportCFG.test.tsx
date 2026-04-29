import { fireEvent, render, screen } from '@testing-library/react'
import type React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import ExportCFG from '@/components/Dashboard/ExportCFG'

const routerReplaceMock = vi.fn()
const trackMock = vi.fn()

vi.mock('next/router', () => ({
  useRouter: () => ({
    pathname: '/dashboard',
    query: {},
    replace: routerReplaceMock,
  }),
}))

vi.mock('antd', () => ({
  Button: ({
    children,
    onClick,
    icon,
  }: React.PropsWithChildren<{ onClick?: () => void; icon?: React.ReactNode }>) => (
    <button onClick={onClick} type='button'>
      {icon}
      {children}
    </button>
  ),
}))

vi.mock('@/lib/track', () => ({
  useTrack: () => trackMock,
}))

vi.mock('@/ui/card', () => ({
  Card: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
}))

vi.mock('@/components/Dashboard/WindowsInstaller', () => ({
  default: () => <div>Windows installer</div>,
}))

vi.mock('@/components/Dashboard/UnixInstaller', () => ({
  default: () => <div>Unix installer</div>,
}))

describe('ExportCFG setup UX', () => {
  beforeEach(() => {
    routerReplaceMock.mockReset()
    trackMock.mockReset()
  })

  it('shows automatic and manual setup as explicit modes', () => {
    render(<ExportCFG />)

    expect(screen.getByRole('button', { name: /automatic setup/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /manual setup/i })).toBeInTheDocument()
    expect(screen.getByText('No premium gate on this step')).toBeInTheDocument()
  })

  it('shows manual installer content when manual setup is selected', () => {
    render(<ExportCFG />)

    fireEvent.click(screen.getByRole('button', { name: /manual setup/i }))

    expect(
      screen.getByText(/you(?:'|’)re using the manual file install path right now/i),
    ).toBeInTheDocument()
    expect(screen.getByText('Unix installer')).toBeInTheDocument()
  })

  it('shows windows installer content by default', () => {
    render(<ExportCFG />)

    expect(screen.getByText('Windows installer')).toBeInTheDocument()
    expect(screen.queryByText('Unix installer')).not.toBeInTheDocument()
  })
})
