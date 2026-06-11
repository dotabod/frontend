import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vite-plus/test'

vi.mock('next/link', () => ({
  default: ({ children, href }: any) => <a href={href}>{children}</a>,
}))
vi.mock('@/ui/card', () => ({
  Card: ({ title, children }: any) => (
    <div>
      <h3>{title}</h3>
      {children}
    </div>
  ),
}))
vi.mock('@/components/Dashboard/Features/TierSwitch', () => ({
  TierSwitch: ({ label, checked }: any) => <span data-checked={String(checked)}>{label}</span>,
}))
vi.mock('@/lib/hooks/useUpdateSetting', () => ({
  useUpdateSetting: vi.fn(() => ({ data: null, updateSetting: vi.fn() })),
}))

import WhatsNewFeatureCard from '@/components/Dashboard/Features/WhatsNewFeatureCard'
import type { WhatsNewEntry } from '@/lib/whatsNew'

const entry: WhatsNewEntry = {
  id: 'demo',
  title: 'Demo feature',
  description: 'A demo feature.',
  releaseDate: '2026-06-10',
  category: 'chat',
  settingKey: 'cosmeticsAnnounce',
  followsNewFeatureMaster: true,
  command: '!demo',
  blogSlug: 'hello-world',
  deepLink: { path: '/dashboard/x', section: 'y' },
  demo: {
    chat: 'Pudge set captured! 3 cosmetics → dotabod.com/streamer/set',
    exampleUrl: 'https://dotabod.com/streamer/set',
    exampleLabel: "See streamer's set page →",
  },
}

describe('WhatsNewFeatureCard', () => {
  it('renders title, command, latest badge, toggle (following master) and links', () => {
    render(<WhatsNewFeatureCard entry={entry} master latest />)

    expect(screen.getByText('Demo feature')).toBeInTheDocument()
    expect(screen.getByText('!demo')).toBeInTheDocument()
    expect(screen.getByText('Latest')).toBeInTheDocument()
    // tri-state with no explicit value follows master (true)
    expect(screen.getByText('Enabled')).toHaveAttribute('data-checked', 'true')
    expect(screen.getByRole('link', { name: /Open settings/ })).toHaveAttribute(
      'href',
      '/dashboard/x#y',
    )
    expect(screen.getByRole('link', { name: /Read more/ })).toHaveAttribute(
      'href',
      '/blog/hello-world',
    )
    // demo: sample chat + live example link
    expect(screen.getByText(/Pudge set captured! 3 cosmetics/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /See streamer's set page/ })).toHaveAttribute(
      'href',
      'https://dotabod.com/streamer/set',
    )
  })

  it('omits the toggle when the feature has no setting', () => {
    render(
      <WhatsNewFeatureCard
        entry={{ ...entry, settingKey: undefined, followsNewFeatureMaster: false }}
        master={false}
      />,
    )
    expect(screen.queryByText('Enabled')).not.toBeInTheDocument()
  })

  it('hides the toggle in read-only mode (public changelog) but keeps links', () => {
    render(<WhatsNewFeatureCard entry={entry} master readOnly />)
    expect(screen.getByText('Demo feature')).toBeInTheDocument()
    expect(screen.queryByText('Enabled')).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Read more/ })).toBeInTheDocument()
  })
})
