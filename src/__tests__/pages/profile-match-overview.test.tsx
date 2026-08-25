import { render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vite-plus/test'
import ProfilePage, { getServerSideProps } from '@/pages/[username]'

const prismaMocks = vi.hoisted(() => ({
  groupBy: vi.fn(),
  matchesFindMany: vi.fn(),
  userFindFirst: vi.fn(),
}))

vi.mock('@/lib/db', () => ({
  default: {
    matches: {
      findMany: prismaMocks.matchesFindMany,
      groupBy: prismaMocks.groupBy,
    },
    user: { findFirst: prismaMocks.userFindFirst },
  },
}))

vi.mock('@/utils/subscription', () => ({
  getSubscription: vi.fn().mockResolvedValue(null),
}))

vi.mock('@/components/Homepage/HomepageShell', () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

vi.mock('@/components/Dashboard/Features/CommandsCard', () => ({
  default: () => null,
}))

vi.mock('@/lib/hooks/useUpdateSetting', () => ({
  useGetSettingsByUsername: () => ({ data: null, error: null, loading: false, notFound: false }),
}))

vi.mock('next/router', () => ({
  useRouter: () => ({ push: vi.fn(), query: { username: 'streamer' } }),
}))

vi.mock('swr', () => ({
  default: () => ({ data: null, isLoading: false }),
}))

const heroPerformance = [
  {
    heroImage: 'https://cdn.example/axe.png',
    heroKey: 'npc_dota_hero_axe',
    heroName: 'Axe',
    losses: 2,
    matches: 7,
    winRate: 71,
    wins: 5,
  },
  {
    heroImage: null,
    heroKey: 'npc_dota_hero_antimage',
    heroName: 'Anti-Mage',
    losses: 2,
    matches: 6,
    winRate: 67,
    wins: 4,
  },
  {
    heroImage: null,
    heroKey: 'npc_dota_hero_bane',
    heroName: 'Bane',
    losses: 2,
    matches: 5,
    winRate: 60,
    wins: 3,
  },
  {
    heroImage: null,
    heroKey: 'npc_dota_hero_bloodseeker',
    heroName: 'Bloodseeker',
    losses: 2,
    matches: 4,
    winRate: 50,
    wins: 2,
  },
  {
    heroImage: null,
    heroKey: 'npc_dota_hero_crystal_maiden',
    heroName: 'Crystal Maiden',
    losses: 2,
    matches: 3,
    winRate: 33,
    wins: 1,
  },
  {
    heroImage: null,
    heroKey: 'npc_dota_hero_drow_ranger',
    heroName: 'Drow Ranger',
    losses: 2,
    matches: 2,
    winRate: 0,
    wins: 0,
  },
]

const recentMatches = [
  {
    createdAt: '2026-08-23T12:00:00.000Z',
    dateLabel: 'Aug 23, 2026',
    heroImage: null,
    heroName: 'Anti-Mage',
    isDoubleDown: false,
    kda: { assists: 9, deaths: 6, kills: 4 },
    matchId: '8964010928',
    queueLabel: 'Turbo · Party',
    score: '29–41',
    won: false,
  },
  {
    createdAt: '2026-08-24T18:30:00.000Z',
    dateLabel: 'Aug 24, 2026',
    heroImage: 'https://cdn.example/axe.png',
    heroName: 'Axe',
    isDoubleDown: true,
    kda: { assists: 12, deaths: 3, kills: 8 },
    matchId: '8964010929',
    queueLabel: 'Ranked',
    score: '64–33',
    won: true,
  },
]

const baseProps = {
  collection: null,
  heroPerformance,
  recentMatches,
  subscriptionInfo: {
    inGracePeriod: false,
    isGracePeriodPro: false,
    isLifetime: false,
    isPro: false,
  },
  userData: {
    createdAt: '2025-01-01T00:00:00.000Z',
    displayName: 'Streamer',
    image: null,
    mmr: 5000,
    name: 'streamer',
    settings: [],
    stream_online: false,
  },
  username: 'streamer',
}

describe('public profile match overview', () => {
  it('loads all-time hero performance and the five latest resolved matches', async () => {
    prismaMocks.userFindFirst.mockResolvedValue({
      cosmeticLoadouts: [],
      createdAt: new Date('2025-01-01T00:00:00.000Z'),
      displayName: 'Streamer',
      id: 'user-1',
      image: null,
      mmr: 5000,
      name: 'streamer',
      settings: [],
      stream_online: false,
    })
    prismaMocks.groupBy.mockResolvedValue([
      { _count: { _all: 3 }, hero_name: 'npc_dota_hero_axe', won: true },
      { _count: { _all: 1 }, hero_name: 'npc_dota_hero_axe', won: false },
    ])
    prismaMocks.matchesFindMany.mockResolvedValue([
      {
        created_at: new Date('2026-08-24T18:30:00.000Z'),
        dire_score: 33,
        game_mode: 22,
        hero_name: 'npc_dota_hero_axe',
        is_doubledown: true,
        is_party: false,
        kda: { assists: 12, deaths: 3, kills: 8 },
        lobby_type: 7,
        matchId: '8964010929',
        myTeam: 'radiant',
        radiant_score: 64,
        won: true,
      },
    ])

    const result = await getServerSideProps({
      params: { username: 'Streamer' },
      res: { setHeader: vi.fn() },
    } as never)

    expect(result).toMatchObject({
      props: {
        heroPerformance: [
          {
            heroKey: 'npc_dota_hero_axe',
            heroName: 'Axe',
            losses: 1,
            matches: 4,
            winRate: 75,
            wins: 3,
          },
        ],
        recentMatches: [
          {
            createdAt: '2026-08-24T18:30:00.000Z',
            dateLabel: 'Aug 24, 2026',
            heroName: 'Axe',
            isDoubleDown: true,
            kda: { assists: 12, deaths: 3, kills: 8 },
            matchId: '8964010929',
            queueLabel: 'Ranked',
            score: '64–33',
            won: true,
          },
        ],
      },
    })
  })

  it('summarizes the most played heroes and links to all hero win rates', () => {
    render(<ProfilePage {...baseProps} />)

    expect(screen.getByRole('heading', { name: 'Most played heroes' })).toBeInTheDocument()
    expect(screen.getByText('All time')).toBeInTheDocument()

    const heroTable = screen.getByRole('table', { name: 'Most played heroes' })
    expect(within(heroTable).getByText('Axe')).toBeInTheDocument()
    expect(within(heroTable).getByText('7')).toBeInTheDocument()
    expect(within(heroTable).getByText('5W / 2L')).toBeInTheDocument()
    expect(within(heroTable).getByText('71%')).toBeInTheDocument()
    expect(within(heroTable).queryByText('Drow Ranger')).not.toBeInTheDocument()

    expect(screen.getByRole('link', { name: 'View all hero win rates' })).toHaveAttribute(
      'href',
      '/streamer/matches?view=heroes',
    )
  })

  it('shows the newest matches first with their result and recorded details', () => {
    render(<ProfilePage {...baseProps} />)

    expect(screen.getByRole('heading', { name: 'Latest matches' })).toBeInTheDocument()
    const matchTable = screen.getByRole('table', { name: 'Latest matches' })
    const rows = within(matchTable).getAllByRole('row')
    expect(within(rows[1]).getByText('Axe')).toBeInTheDocument()
    expect(within(rows[1]).getByText('Win')).toBeInTheDocument()
    expect(within(rows[1]).getByText('Ranked · Double down')).toBeInTheDocument()
    expect(within(rows[1]).getByText('8 / 3 / 12')).toBeInTheDocument()
    expect(within(rows[1]).getByText('64–33')).toBeInTheDocument()
    expect(within(rows[1]).getByText('Aug 24, 2026')).toBeInTheDocument()
    expect(
      within(rows[1]).getByRole('link', { name: 'Open match 8964010929 on OpenDota' }),
    ).toHaveAttribute('href', 'https://www.opendota.com/matches/8964010929')

    expect(screen.getByRole('link', { name: 'View all matches' })).toHaveAttribute(
      'href',
      '/streamer/matches',
    )
  })

  it('keeps both overview destinations discoverable before matches have been recorded', () => {
    render(<ProfilePage {...baseProps} heroPerformance={[]} recentMatches={[]} />)

    expect(screen.getByText('No recorded hero results yet')).toBeInTheDocument()
    expect(screen.getByText('No recorded matches yet')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'View all hero win rates' })).toHaveAttribute(
      'href',
      '/streamer/matches?view=heroes',
    )
    expect(screen.getByRole('link', { name: 'View all matches' })).toHaveAttribute(
      'href',
      '/streamer/matches',
    )
  })
})
