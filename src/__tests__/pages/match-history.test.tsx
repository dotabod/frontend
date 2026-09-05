import { render, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import MatchHistoryPage, { getServerSideProps } from '@/pages/[username]/matches'

const prismaMocks = vi.hoisted(() => ({
  groupBy: vi.fn(),
  matchesFindFirst: vi.fn(),
  matchesFindMany: vi.fn(),
  userFindFirst: vi.fn(),
}))

vi.mock('@/lib/db', () => ({
  default: {
    matches: {
      findFirst: prismaMocks.matchesFindFirst,
      findMany: prismaMocks.matchesFindMany,
      groupBy: prismaMocks.groupBy,
    },
    user: { findFirst: prismaMocks.userFindFirst },
  },
}))

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

function databaseMatch(index: number) {
  return {
    created_at: new Date(Date.UTC(2026, 7, 25 - index, 12)),
    dire_score: 33,
    game_mode: 22,
    hero_name: 'npc_dota_hero_axe',
    id: `00000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`,
    is_doubledown: false,
    is_party: false,
    kda: { assists: 12, deaths: 3, kills: 8 },
    lobby_type: 7,
    matchId: String(8_964_010_929n - BigInt(index)),
    myTeam: 'radiant',
    radiant_score: 64,
    won: true,
  }
}

beforeEach(() => {
  prismaMocks.groupBy.mockReset()
  prismaMocks.matchesFindFirst.mockReset()
  prismaMocks.matchesFindMany.mockReset()
  prismaMocks.userFindFirst.mockReset()

  prismaMocks.groupBy.mockResolvedValue([
    { _count: { _all: 21 }, hero_name: 'npc_dota_hero_axe', won: true },
  ])
  prismaMocks.matchesFindFirst.mockResolvedValue({
    created_at: new Date('2026-08-05T12:00:00.000Z'),
  })
  prismaMocks.userFindFirst.mockResolvedValue({
    displayName: 'Streamer',
    id: 'user-1',
    image: null,
    name: 'streamer',
  })
})

describe('public match history page', () => {
  it('bounds the initial match query and exposes only the first page', async () => {
    prismaMocks.matchesFindMany.mockResolvedValue(
      Array.from({ length: 21 }, (_, index) => databaseMatch(index)),
    )

    const result = await getServerSideProps({
      params: { username: 'Streamer' },
      query: {},
      res: { setHeader: vi.fn() },
    } as never)

    expect(prismaMocks.matchesFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: [{ created_at: 'desc' }, { id: 'desc' }],
        take: 21,
      }),
    )
    expect(result).toMatchObject({
      props: {
        matches: expect.arrayContaining([
          expect.objectContaining({ matchId: '8964010929' }),
          expect.objectContaining({ matchId: '8964010910' }),
        ]),
        nextCursor: expect.any(String),
      },
    })
    if (!('props' in result)) {
      throw new Error('Expected match-history props')
    }
    expect((await result.props).matches).toHaveLength(20)
  })

  it('links to the next cursor page while preserving the selected period', () => {
    render(<MatchHistoryPage {...baseProps} nextCursor='next-page' period='30d' />)

    expect(screen.getByRole('link', { name: 'View older matches' })).toHaveAttribute(
      'href',
      '/streamer/matches?cursor=next-page&period=30d',
    )
  })

  it('does not load a page of match rows for the hero win-rate view', async () => {
    prismaMocks.matchesFindMany.mockResolvedValue([])

    const result = await getServerSideProps({
      params: { username: 'Streamer' },
      query: { view: 'heroes' },
      res: { setHeader: vi.fn() },
    } as never)

    expect(prismaMocks.matchesFindMany).not.toHaveBeenCalled()
    expect(result).toMatchObject({ props: { matches: [], nextCursor: null, view: 'heroes' } })
  })

  it('renders a concise record summary and removes implementation copy', () => {
    render(<MatchHistoryPage {...baseProps} />)

    expect(screen.getByRole('heading', { name: 'Match history' })).toBeInTheDocument()
    const record = screen.getByRole('region', { name: 'Match record' })
    expect(within(record).getByText('6 wins')).toBeInTheDocument()
    expect(within(record).getByText('4 losses')).toBeInTheDocument()
    expect(within(record).getByText('60% win rate')).toBeInTheDocument()
    expect(within(record).getByText('10 matches')).toBeInTheDocument()
    expect(within(record).getByText('2 heroes')).toBeInTheDocument()
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
    expect(screen.getByRole('link', { name: /8964010929/i })).toHaveTextContent('OpenDota')
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
      screen.getAllByRole('link', { name: /Open match/ }).map((link) => link.getAttribute('href')),
    ).toStrictEqual([
      'https://www.opendota.com/matches/8964010930',
      'https://www.opendota.com/matches/8964010928',
    ])
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

  it('keeps the profile tab rail from scrolling vertically', () => {
    render(<MatchHistoryPage {...baseProps} />)

    expect(screen.getByRole('navigation', { name: 'Profile sections' })).toHaveClass(
      'overflow-y-hidden',
    )
  })
})
