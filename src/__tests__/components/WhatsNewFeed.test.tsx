import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vite-plus/test'

vi.mock('next/link', () => ({
  default: ({ children, href }: any) => <a href={href}>{children}</a>,
}))
vi.mock('@/lib/hooks/useUpdateSetting', () => ({
  useUpdateSetting: vi.fn(() => ({ data: null, updateSetting: vi.fn() })),
}))
vi.mock('@/components/Dashboard/CommandDetail', () => ({ default: {} }))

import WhatsNewFeed from '@/components/Dashboard/Features/WhatsNewFeed'
import type { WhatsNewEntry } from '@/lib/whatsNew'

const entries: WhatsNewEntry[] = [
  {
    category: 'pages',
    deepLink: { path: '/dashboard' },
    description: 'A clearer public profile.',
    id: 'profile-page',
    releaseDate: '2026-08-25',
    title: 'Public profiles',
  },
  {
    category: 'commands',
    command: '!today',
    description: 'Daily hero results in chat.',
    id: 'today-command',
    releaseDate: '2026-08-13',
    title: '!today hero stats',
  },
  {
    category: 'overlay',
    deepLink: { path: '/dashboard/features/overlay' },
    description: 'More reliable overlay text.',
    id: 'overlay-fix',
    releaseDate: '2026-08-13',
    title: 'Overlay text fixes',
  },
]

describe('WhatsNewFeed', () => {
  it('filters the chronological feed into user-facing groups', () => {
    render(<WhatsNewFeed entries={entries} readOnly />)

    expect(screen.getByText('3 updates')).toBeInTheDocument()
    expect(screen.getAllByRole('article')).toHaveLength(3)
    expect(screen.getByRole('button', { name: 'All updates' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )

    fireEvent.click(screen.getByRole('button', { name: 'Chat & commands' }))

    expect(screen.getByText('1 update')).toBeInTheDocument()
    expect(screen.getAllByRole('article')).toHaveLength(1)
    expect(screen.getByRole('article', { name: '!today hero stats' })).toBeInTheDocument()
    expect(screen.queryByRole('article', { name: 'Public profiles' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Chat & commands' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  })

  it('keeps releases grouped by date after filtering', () => {
    render(<WhatsNewFeed entries={entries} readOnly />)

    fireEvent.click(screen.getByRole('button', { name: 'Stream tools' }))

    expect(screen.getByRole('heading', { name: 'August 13, 2026' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'August 25, 2026' })).not.toBeInTheDocument()
    expect(screen.getByRole('article', { name: 'Overlay text fixes' })).toBeInTheDocument()
  })
})
