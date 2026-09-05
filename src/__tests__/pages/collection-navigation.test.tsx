import { render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import SetPage from '@/pages/[username]/set'
import DetailPage from '@/pages/[username]/set/[heroId]'

vi.mock('@/components/Homepage/HomepageShell', () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

vi.mock('next/router', () => ({
  useRouter: () => ({ push: vi.fn() }),
}))

const setProps = {
  cards: [],
  displayName: 'Streamer',
  image: null,
  rosterSize: 126,
  tally: [],
  username: 'streamer',
}

const detailProps = {
  displayName: 'Streamer',
  heroId: 2,
  heroImage: null,
  heroName: 'Axe',
  items: [],
  next: { heroId: 3, heroName: 'Bane' },
  position: 2,
  prev: { heroId: 1, heroName: 'Anti-Mage' },
  total: 3,
  updatedIso: '2026-08-24T12:00:00.000Z',
  updatedLabel: 'Aug 24, 2026, 12:00 PM',
  username: 'streamer',
}

describe('cosmetic collection profile navigation', () => {
  it('links the collection page to match history', () => {
    render(<SetPage {...setProps} />)

    const profileSections = screen.getByRole('navigation', { name: 'Profile sections' })
    expect(within(profileSections).getByRole('link', { name: 'Match history' })).toHaveAttribute(
      'href',
      '/streamer/matches',
    )
  })

  it('marks cosmetic collection as current on the collection page', () => {
    render(<SetPage {...setProps} />)

    const profileSections = screen.getByRole('navigation', { name: 'Profile sections' })
    expect(
      within(profileSections).getByRole('link', { name: 'Cosmetic collection' }),
    ).toHaveAttribute('aria-current', 'page')
    expect(
      within(profileSections).getByRole('link', { name: 'Match history' }),
    ).not.toHaveAttribute('aria-current')
  })

  it('links a hero detail page to match history', () => {
    render(<DetailPage {...detailProps} />)

    const profileSections = screen.getByRole('navigation', { name: 'Profile sections' })
    expect(within(profileSections).getByRole('link', { name: 'Match history' })).toHaveAttribute(
      'href',
      '/streamer/matches',
    )
  })

  it('keeps cosmetic collection current on a hero detail page', () => {
    render(<DetailPage {...detailProps} />)

    const profileSections = screen.getByRole('navigation', { name: 'Profile sections' })
    expect(
      within(profileSections).getByRole('link', { name: 'Cosmetic collection' }),
    ).toHaveAttribute('aria-current', 'page')
    expect(
      within(profileSections).getByRole('link', { name: 'Match history' }),
    ).not.toHaveAttribute('aria-current')
  })

  it('preserves previous and next hero navigation', () => {
    render(<DetailPage {...detailProps} />)

    expect(screen.getByRole('link', { name: 'Anti-Mage' })).toHaveAttribute(
      'href',
      '/streamer/set/1',
    )
    expect(screen.getByRole('link', { name: 'Bane' })).toHaveAttribute('href', '/streamer/set/3')
  })

  it('keeps the shared profile tab rail from scrolling vertically', () => {
    render(<SetPage {...setProps} />)

    expect(screen.getByRole('navigation', { name: 'Profile sections' })).toHaveClass(
      'overflow-y-hidden',
    )
  })
})
