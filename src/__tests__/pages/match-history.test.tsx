import { render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vite-plus/test'
import MatchHistoryPage from '@/pages/[username]/matches'

vi.mock('@/components/Homepage/HomepageShell', () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

const baseProps = {
  displayName: 'Streamer',
  heroPerformance: [
    {
      heroImage: 'https://cdn.example/axe.png',
      heroKey: 'npc_dota_hero_axe',
      heroName: 'Axe',
      losses: 2,
      matches: 6,
      winRate: 67,
      wins: 4,
    },
  ],
  image: null,
  matches: [
    {
      createdAt: '2026-08-24T18:30:00.000Z',
      dateLabel: 'Aug 24, 2026',
      heroImage: 'https://cdn.example/axe.png',
      heroName: 'Axe',
      isDoubleDown: false,
      kda: { assists: 12, deaths: 3, kills: 8 },
      matchId: '8964010929',
      queueLabel: 'Ranked',
      score: '64–33',
      won: true,
    },
  ],
  nextCursor: null,
  oldestTrackedLabel: 'Aug 21, 2026',
  period: 'all' as const,
  summary: { heroesPlayed: 2, losses: 4, matches: 10, winRate: 60, wins: 6 },
  username: 'streamer',
  view: 'matches' as const,
}

describe('public match history page', () => {
  it('renders a concise record summary and removes implementation copy', () => {
    render(<MatchHistoryPage {...baseProps} />)

    expect(screen.getByRole('heading', { name: 'Match history' })).toBeInTheDocument()
    expect(screen.getByText('6 wins')).toBeInTheDocument()
    expect(screen.getByText('4 losses')).toBeInTheDocument()
    expect(screen.getByText('60% win rate')).toBeInTheDocument()
    expect(screen.getByText('10 matches')).toBeInTheDocument()
    expect(screen.getByText('2 heroes')).toBeInTheDocument()
    expect(screen.queryByText(/Results include matches/i)).not.toBeInTheDocument()
    expect(screen.getByTestId('match-history-page')).toHaveClass('font-sans')
  })

  it('shows the match table in the default view', () => {
    render(<MatchHistoryPage {...baseProps} />)

    expect(screen.getByRole('heading', { name: 'Matches' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Hero win rates' })).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Hero records' })).not.toBeInTheDocument()
    expect(screen.getAllByText('KDA')).not.toHaveLength(0)
    expect(screen.getAllByText('Score')).not.toHaveLength(0)
    expect(
      within(screen.getByRole('table', { name: 'Recent matches' })).getByText('Axe'),
    ).toBeInTheDocument()
    expect(screen.getByText('8 / 3 / 12')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /8964010929/i })).toHaveAttribute(
      'href',
      'https://www.opendota.com/matches/8964010929',
    )
  })

  it('switches to hero win rates while preserving the period filter', () => {
    render(<MatchHistoryPage {...baseProps} period='30d' view='heroes' />)

    const viewNavigation = screen.getByRole('navigation', { name: 'Match history view' })
    expect(within(viewNavigation).getByRole('link', { name: 'Hero win rates' })).toHaveAttribute(
      'aria-current',
      'page',
    )
    expect(within(viewNavigation).getByRole('link', { name: 'Matches' })).toHaveAttribute(
      'href',
      '/streamer/matches?period=30d',
    )
    expect(screen.getByRole('heading', { name: 'Hero win rates' })).toBeInTheDocument()
    expect(
      within(screen.getByRole('table', { name: 'Hero win rates' })).getByText('67%'),
    ).toBeInTheDocument()
    expect(screen.queryByRole('table', { name: 'Recent matches' })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: '7 days' })).toHaveAttribute(
      'href',
      '/streamer/matches?period=7d&view=heroes',
    )
  })

  it('marks matches as the current default view', () => {
    render(<MatchHistoryPage {...baseProps} />)

    const viewNavigation = screen.getByRole('navigation', { name: 'Match history view' })
    expect(within(viewNavigation).getByRole('link', { name: 'Matches' })).toHaveAttribute(
      'aria-current',
      'page',
    )
    expect(within(viewNavigation).getByRole('link', { name: 'Hero win rates' })).toHaveAttribute(
      'href',
      '/streamer/matches?view=heroes',
    )
  })

  it('explains when tracked matches have no hero data', () => {
    render(
      <MatchHistoryPage
        {...baseProps}
        heroPerformance={[]}
        summary={{ heroesPlayed: 0, losses: 0, matches: 1, winRate: 100, wins: 1 }}
        view='heroes'
      />,
    )

    expect(screen.getByRole('heading', { name: 'Hero win rates' })).toBeInTheDocument()
    expect(screen.getByText('No hero data in this period')).toBeInTheDocument()
  })

  it('renders one accessible row for each match', () => {
    const secondMatch = {
      ...baseProps.matches[0],
      createdAt: '2026-08-23T18:30:00.000Z',
      dateLabel: 'Aug 23, 2026',
      heroName: 'Pudge',
      matchId: '8964010928',
      won: false,
    }

    render(<MatchHistoryPage {...baseProps} matches={[baseProps.matches[0], secondMatch]} />)

    const matchTable = screen.getByRole('table', { name: 'Recent matches' })
    expect(within(matchTable).getAllByRole('row')).toHaveLength(3)
  })

  it('teaches the empty state without hiding the period controls', () => {
    render(
      <MatchHistoryPage
        {...baseProps}
        heroPerformance={[]}
        matches={[]}
        period='7d'
        summary={{ heroesPlayed: 0, losses: 0, matches: 0, winRate: 0, wins: 0 }}
      />,
    )

    expect(screen.getByRole('link', { name: '7 days' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByText('No matches in this period')).toBeInTheDocument()
  })

  it('shows the most recently created match first', () => {
    const olderMatch = {
      ...baseProps.matches[0],
      createdAt: '2026-08-23T18:30:00.000Z',
      dateLabel: 'Aug 23, 2026',
      matchId: '8964010928',
      won: false,
    }
    const newerMatch = {
      ...baseProps.matches[0],
      createdAt: '2026-08-25T18:30:00.000Z',
      dateLabel: 'Aug 25, 2026',
      matchId: '8964010930',
    }

    render(<MatchHistoryPage {...baseProps} matches={[olderMatch, newerMatch]} />)

    expect(
      screen.getAllByRole('link', { name: /Open match/ }).map((link) => link.textContent),
    ).toEqual(['8964010930', '8964010928'])
  })

  it('links match history to the cosmetic collection', () => {
    render(<MatchHistoryPage {...baseProps} />)

    const profileSections = screen.getByRole('navigation', { name: 'Profile sections' })
    expect(
      within(profileSections).getByRole('link', { name: 'Cosmetic collection' }),
    ).toHaveAttribute('href', '/streamer/set')
  })

  it('marks match history as the current profile section', () => {
    render(<MatchHistoryPage {...baseProps} />)

    const profileSections = screen.getByRole('navigation', { name: 'Profile sections' })
    expect(within(profileSections).getByRole('link', { name: 'Match history' })).toHaveAttribute(
      'aria-current',
      'page',
    )
    expect(
      within(profileSections).getByRole('link', { name: 'Cosmetic collection' }),
    ).not.toHaveAttribute('aria-current')
  })
})
