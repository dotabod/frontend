import { ArrowUpRight } from 'lucide-react'
import type { GetServerSideProps } from 'next'
import Head from 'next/head'
import Link from 'next/link'
import { Container } from '@/components/Container'
import HomepageShell from '@/components/Homepage/HomepageShell'
import { ProfileSectionNav } from '@/components/ProfileSectionNav'
import prisma from '@/lib/db'
import {
  buildHeroPerformance,
  buildMatchHistorySummary,
  decodeMatchHistoryCursor,
  encodeMatchHistoryCursor,
  formatQueueLabel,
  formatStreamerScore,
  type HeroPerformance,
  type MatchHistoryRow,
  readKda,
} from '@/lib/matchHistory'

const PAGE_SIZE = 20

const PERIODS = [
  { label: '7 days', value: '7d' },
  { label: '30 days', value: '30d' },
  { label: 'All time', value: 'all' },
] as const

const VIEWS = [
  { label: 'Matches', value: 'matches' },
  { label: 'Hero win rates', value: 'heroes' },
] as const

type MatchPeriod = (typeof PERIODS)[number]['value']
type MatchView = (typeof VIEWS)[number]['value']

export interface MatchHistoryPageProps {
  displayName: string
  heroPerformance: HeroPerformance[]
  image: string | null
  matches: MatchHistoryRow[]
  nextCursor: string | null
  oldestTrackedLabel: string | null
  period: MatchPeriod
  summary: {
    heroesPlayed: number
    losses: number
    matches: number
    winRate: number
    wins: number
  }
  username: string
  view: MatchView
}

function periodStart(period: MatchPeriod): Date | null {
  if (period === 'all') return null
  const days = period === '7d' ? 7 : 30
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000)
}

function normalizePeriod(value: string | string[] | undefined): MatchPeriod {
  return value === '7d' || value === '30d' ? value : 'all'
}

function normalizeView(value: string | string[] | undefined): MatchView {
  return value === 'heroes' ? 'heroes' : 'matches'
}

function matchHistoryHref(username: string, period: MatchPeriod, view: MatchView): string {
  const search = new URLSearchParams()
  if (period !== 'all') search.set('period', period)
  if (view === 'heroes') search.set('view', view)
  const query = search.toString()
  return `/${username}/matches${query ? `?${query}` : ''}`
}

function WinRateBar({ value }: { value: number }) {
  return (
    <div className='flex items-center gap-3'>
      <div className='h-1.5 w-20 overflow-hidden rounded-full bg-gray-700' aria-hidden>
        <div className='h-full rounded-full bg-purple-500' style={{ width: `${value}%` }} />
      </div>
      <span className='w-10 text-right tabular-nums text-gray-200'>{value}%</span>
    </div>
  )
}

function HeroWinRatesTable({ heroes }: { heroes: HeroPerformance[] }) {
  return (
    <section aria-labelledby='hero-win-rates-heading'>
      <div className='mb-4 flex items-baseline justify-between gap-4'>
        <h2 id='hero-win-rates-heading' className='text-xl font-semibold text-gray-100'>
          Hero win rates
        </h2>
        <span className='text-sm tabular-nums text-gray-400'>
          {heroes.length} {heroes.length === 1 ? 'hero' : 'heroes'}
        </span>
      </div>

      {heroes.length === 0 ? (
        <div className='rounded-lg border border-gray-700 bg-gray-900/60 px-6 py-10 text-center'>
          <p className='font-medium text-gray-200'>No hero data in this period</p>
          <p className='mt-1 text-sm text-gray-400'>
            Hero information was not recorded for these matches.
          </p>
        </div>
      ) : (
        <div className='overflow-hidden rounded-lg border border-gray-700 bg-gray-900/60'>
          <table aria-label='Hero win rates' className='w-full table-fixed'>
            <thead className='hidden text-left text-xs font-medium text-gray-400 sm:table-header-group'>
              <tr className='border-b border-gray-700'>
                <th scope='col' className='px-5 py-3 font-medium'>
                  Hero
                </th>
                <th scope='col' className='w-28 px-3 py-3 font-medium'>
                  Matches
                </th>
                <th scope='col' className='w-32 px-3 py-3 font-medium'>
                  Record
                </th>
                <th scope='col' className='w-44 px-3 py-3 pr-5 font-medium'>
                  Win rate
                </th>
              </tr>
            </thead>
            <tbody className='divide-y divide-gray-800'>
              {heroes.map((hero) => (
                <tr
                  key={hero.heroKey}
                  className='grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 p-4 sm:table-row sm:p-0'
                >
                  <td className='col-start-1 row-start-1 block min-w-0 sm:table-cell sm:px-5 sm:py-3 sm:align-middle'>
                    <div className='flex min-w-0 items-center gap-3'>
                      {hero.heroImage ? (
                        <img
                          src={hero.heroImage}
                          alt=''
                          aria-hidden
                          width={36}
                          height={36}
                          className='h-9 w-9 rounded-md object-cover'
                        />
                      ) : (
                        <span className='h-9 w-9 rounded-md bg-gray-800' aria-hidden />
                      )}
                      <span className='truncate font-medium text-gray-100'>{hero.heroName}</span>
                    </div>
                  </td>
                  <td className='col-start-2 row-start-1 block text-right text-sm tabular-nums text-gray-400 sm:table-cell sm:px-3 sm:py-3 sm:text-left sm:align-middle'>
                    <span className='sm:hidden'>{hero.matches} matches</span>
                    <span className='hidden sm:inline'>{hero.matches}</span>
                  </td>
                  <td className='col-start-1 row-start-2 block text-sm tabular-nums text-gray-300 sm:table-cell sm:px-3 sm:py-3 sm:align-middle'>
                    <span className='text-emerald-300'>{hero.wins}W</span>
                    <span className='mx-1.5 text-gray-600' aria-hidden>
                      /
                    </span>
                    <span className='text-red-300'>{hero.losses}L</span>
                  </td>
                  <td className='col-start-2 row-start-2 block text-sm sm:table-cell sm:px-3 sm:py-3 sm:pr-5 sm:align-middle'>
                    <WinRateBar value={hero.winRate} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

function MatchList({ matches }: { matches: MatchHistoryRow[] }) {
  const orderedMatches = [...matches].sort(
    (first, second) => Date.parse(second.createdAt) - Date.parse(first.createdAt),
  )

  return (
    <div className='overflow-hidden rounded-lg border border-gray-700 bg-gray-900/60'>
      <table aria-label='Recent matches' className='w-full table-fixed'>
        <thead className='hidden text-left text-xs font-medium text-gray-400 sm:table-header-group'>
          <tr className='border-b border-gray-700'>
            <th scope='col' className='w-24 px-5 py-3 font-medium'>
              Result
            </th>
            <th scope='col' className='px-3 py-3 font-medium'>
              Hero
            </th>
            <th scope='col' className='w-40 px-3 py-3 font-medium'>
              KDA
            </th>
            <th scope='col' className='w-32 px-3 py-3 font-medium'>
              Score
            </th>
            <th scope='col' className='w-40 px-3 py-3 pr-5 font-medium'>
              Match
            </th>
          </tr>
        </thead>
        <tbody className='divide-y divide-gray-800'>
          {orderedMatches.map((match) => (
            <tr
              key={match.matchId}
              className='grid grid-cols-2 gap-x-4 gap-y-4 p-4 sm:table-row sm:p-0'
            >
              <td className='col-start-2 row-start-1 block text-right sm:table-cell sm:px-5 sm:py-4 sm:text-left sm:align-middle'>
                <span
                  className={`inline-block rounded-md px-2.5 py-1 text-xs font-semibold ${
                    match.won
                      ? 'border border-emerald-800 bg-emerald-950/40 text-emerald-200'
                      : 'border border-red-800 bg-red-950/40 text-red-200'
                  }`}
                >
                  {match.won ? 'Win' : 'Loss'}
                </span>
              </td>

              <td className='col-start-1 row-start-1 block min-w-0 sm:table-cell sm:px-3 sm:py-4 sm:align-middle'>
                <div className='flex min-w-0 items-center gap-3'>
                  {match.heroImage ? (
                    <img
                      src={match.heroImage}
                      alt=''
                      aria-hidden
                      width={40}
                      height={40}
                      className='h-10 w-10 rounded-md object-cover'
                    />
                  ) : (
                    <span className='h-10 w-10 rounded-md bg-gray-800' aria-hidden />
                  )}
                  <div className='min-w-0'>
                    <p className='truncate font-medium text-gray-100'>{match.heroName}</p>
                    <p className='mt-0.5 text-xs text-gray-400'>
                      {match.queueLabel}
                      {match.isDoubleDown ? ' · Double down' : ''}
                    </p>
                  </div>
                </div>
              </td>

              <td className='col-start-1 row-start-2 block text-sm text-gray-400 sm:table-cell sm:px-3 sm:py-4 sm:align-middle'>
                <span className='mr-2 text-xs text-gray-400 sm:hidden'>KDA</span>
                <span className='tabular-nums text-gray-200'>
                  {match.kda
                    ? `${match.kda.kills} / ${match.kda.deaths} / ${match.kda.assists}`
                    : 'Not recorded'}
                </span>
              </td>

              <td className='col-start-2 row-start-2 block text-sm text-gray-400 sm:table-cell sm:px-3 sm:py-4 sm:align-middle'>
                <span className='mr-2 text-xs text-gray-400 sm:hidden'>Score</span>
                <span className='tabular-nums'>{match.score ?? 'Not recorded'}</span>
              </td>

              <td className='col-span-2 row-start-3 flex items-center justify-between gap-3 sm:table-cell sm:px-3 sm:py-4 sm:pr-5 sm:align-middle'>
                <time className='text-xs text-gray-400'>{match.dateLabel}</time>
                <a
                  href={`https://www.opendota.com/matches/${match.matchId}`}
                  target='_blank'
                  rel='noopener noreferrer'
                  aria-label={`Open match ${match.matchId} on OpenDota`}
                  className='mt-1 inline-flex items-center gap-1 text-xs text-purple-300 hover:text-purple-200'
                >
                  {match.matchId}
                  <ArrowUpRight size={13} aria-hidden />
                </a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function MatchSummary({ summary }: Pick<MatchHistoryPageProps, 'summary'>) {
  return (
    <dl className='flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-gray-400'>
      <div>
        <dt className='sr-only'>Wins</dt>
        <dd className='font-semibold tabular-nums text-emerald-300'>{summary.wins} wins</dd>
      </div>
      <span className='h-4 w-px bg-gray-600' aria-hidden />
      <div>
        <dt className='sr-only'>Losses</dt>
        <dd className='font-semibold tabular-nums text-red-300'>{summary.losses} losses</dd>
      </div>
      <span className='h-4 w-px bg-gray-600' aria-hidden />
      <div>
        <dt className='sr-only'>Win rate</dt>
        <dd className='tabular-nums text-gray-200'>{summary.winRate}% win rate</dd>
      </div>
      <span className='h-4 w-px bg-gray-600' aria-hidden />
      <div>
        <dt className='sr-only'>Matches</dt>
        <dd className='tabular-nums'>{summary.matches} matches</dd>
      </div>
      <span className='h-4 w-px bg-gray-600' aria-hidden />
      <div>
        <dt className='sr-only'>Heroes</dt>
        <dd className='tabular-nums'>
          {summary.heroesPlayed} {summary.heroesPlayed === 1 ? 'hero' : 'heroes'}
        </dd>
      </div>
    </dl>
  )
}

const MatchHistoryPage = ({
  displayName,
  heroPerformance,
  image,
  matches,
  nextCursor,
  oldestTrackedLabel,
  period,
  summary,
  username,
  view,
}: MatchHistoryPageProps) => {
  const pageTitle = `${displayName}'s Dota 2 match history | Dotabod`
  const pageDescription = `${displayName}'s streamed Dota 2 record, hero win rates, and recent matches tracked by Dotabod.`

  return (
    <>
      <Head>
        <title>{pageTitle}</title>
        <meta name='description' content={pageDescription} />
        <link rel='canonical' href={`https://dotabod.com/${username}/matches`} />
        <meta name='robots' content='noindex, follow' />
      </Head>
      <HomepageShell
        dontUseTitle
        ogImage={{ subtitle: 'Streamed Dota 2 record and hero win rates.', title: displayName }}
      >
        <div data-testid='match-history-page' className='font-sans'>
          <header className='border-b border-gray-800 bg-gray-950'>
            <Container className='py-8 sm:py-10'>
              <Link
                href={`/${username}`}
                className='inline-flex items-center gap-2.5 text-sm font-medium text-gray-300 hover:text-gray-100'
              >
                <img
                  onError={(event) => {
                    event.currentTarget.src = '/images/hero/default.png'
                  }}
                  src={image || '/images/hero/default.png'}
                  alt=''
                  aria-hidden
                  width={28}
                  height={28}
                  className='h-7 w-7 rounded-full ring-1 ring-gray-700'
                />
                {displayName}
              </Link>

              <h1 className='mt-5 text-3xl font-semibold tracking-tight text-gray-100 sm:text-4xl'>
                Match history
              </h1>
              {oldestTrackedLabel && (
                <p className='mt-2 text-sm text-gray-400'>Tracked since {oldestTrackedLabel}</p>
              )}
            </Container>
          </header>

          <ProfileSectionNav current='matches' username={username} />

          <Container className='py-8 sm:py-10'>
            <div className='mb-10 flex flex-col gap-5 border-b border-gray-700 pb-6 sm:flex-row sm:items-center sm:justify-between'>
              <MatchSummary summary={summary} />
              <nav aria-label='Match history period' className='flex flex-wrap gap-2'>
                {PERIODS.map((option) => {
                  const active = option.value === period
                  return (
                    <Link
                      key={option.value}
                      href={matchHistoryHref(username, option.value, view)}
                      aria-current={active ? 'page' : undefined}
                      className={`rounded-md border px-3 py-1.5 text-sm font-medium transition-colors ${
                        active
                          ? 'border-purple-500 bg-purple-950/40 text-purple-200'
                          : 'border-gray-700 bg-gray-900 text-gray-400 hover:border-gray-600 hover:text-gray-200'
                      }`}
                    >
                      {option.label}
                    </Link>
                  )
                })}
              </nav>
            </div>

            <nav
              aria-label='Match history view'
              className='mb-6 inline-flex rounded-md border border-gray-700 bg-gray-900 p-1'
            >
              {VIEWS.map((option) => {
                const active = option.value === view
                return (
                  <Link
                    key={option.value}
                    href={matchHistoryHref(username, period, option.value)}
                    aria-current={active ? 'page' : undefined}
                    className={`rounded-sm px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-2! focus-visible:outline-offset-2 focus-visible:outline-purple-400 ${
                      active
                        ? 'bg-gray-700 text-gray-100!'
                        : 'text-gray-400! hover:bg-gray-800 hover:text-gray-200!'
                    }`}
                  >
                    {option.label}
                  </Link>
                )
              })}
            </nav>

            {summary.matches === 0 ? (
              <section className='rounded-lg border border-gray-700 bg-gray-900/60 px-6 py-12 text-center'>
                <h2 className='text-lg font-semibold text-gray-100'>No matches in this period</h2>
                <p className='mx-auto mt-2 max-w-lg text-sm leading-6 text-gray-400'>
                  Try a longer time range, or check back after {displayName}'s next tracked match.
                </p>
              </section>
            ) : (
              <div>
                {view === 'matches' ? (
                  <section aria-labelledby='matches-heading'>
                    <h2 id='matches-heading' className='mb-4 text-xl font-semibold text-gray-100'>
                      Matches
                    </h2>
                    <MatchList matches={matches} />
                    {nextCursor && (
                      <div className='mt-5 flex justify-center'>
                        <Link
                          href={{
                            pathname: `/${username}/matches`,
                            query: { cursor: nextCursor, ...(period === 'all' ? {} : { period }) },
                          }}
                          className='rounded-md border border-gray-700 bg-gray-900 px-4 py-2 text-sm font-medium text-gray-200 hover:border-gray-600 hover:bg-gray-800'
                        >
                          View older matches
                        </Link>
                      </div>
                    )}
                  </section>
                ) : (
                  <HeroWinRatesTable heroes={heroPerformance} />
                )}
              </div>
            )}
          </Container>
        </div>
      </HomepageShell>
    </>
  )
}

export const getServerSideProps: GetServerSideProps<MatchHistoryPageProps> = async ({
  params,
  query,
  res,
}) => {
  res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=3600')

  const username = (params?.username as string)?.toLowerCase()
  if (!username) return { notFound: true }

  const period = normalizePeriod(query.period)
  const view = normalizeView(query.view)
  const cursor = decodeMatchHistoryCursor(query.cursor)
  const start = periodStart(period)

  const user = await prisma.user.findFirst({
    where: { name: username },
    select: { displayName: true, id: true, image: true, name: true },
  })
  if (!user) return { notFound: true }

  const periodWhere = {
    userId: user.id,
    won: { not: null },
    ...(start ? { created_at: { gte: start } } : {}),
  }

  const cursorWhere = cursor
    ? {
        OR: [
          { created_at: { lt: new Date(cursor.createdAt) } },
          { created_at: new Date(cursor.createdAt), id: { lt: cursor.id } },
        ],
      }
    : {}

  const [groups, matchRows, oldestTracked] = await Promise.all([
    prisma.matches.groupBy({
      by: ['hero_name', 'won'],
      where: periodWhere,
      _count: { _all: true },
    }),
    view === 'matches'
      ? prisma.matches.findMany({
          where: { ...periodWhere, ...cursorWhere },
          orderBy: [{ created_at: 'desc' }, { id: 'desc' }],
          take: PAGE_SIZE + 1,
          select: {
            created_at: true,
            dire_score: true,
            game_mode: true,
            hero_name: true,
            id: true,
            is_doubledown: true,
            is_party: true,
            kda: true,
            lobby_type: true,
            matchId: true,
            myTeam: true,
            radiant_score: true,
            won: true,
          },
        })
      : Promise.resolve([]),
    prisma.matches.findFirst({
      where: { userId: user.id, won: { not: null } },
      orderBy: [{ created_at: 'asc' }, { id: 'asc' }],
      select: { created_at: true },
    }),
  ])

  const resultGroups = groups.map((group) => ({
    count: group._count._all,
    heroName: group.hero_name,
    won: group.won,
  }))
  const summary = buildMatchHistorySummary(resultGroups)

  const heroes = (await import('dotaconstants/build/heroes.json')).default as Record<
    string,
    { icon?: string; localized_name?: string; name?: string }
  >
  const heroPerformance = buildHeroPerformance(resultGroups, heroes)
  const heroPresentation = new Map(
    heroPerformance.map((hero) => [
      hero.heroKey,
      { heroImage: hero.heroImage, heroName: hero.heroName },
    ]),
  )

  const hasNextPage = matchRows.length > PAGE_SIZE
  const pageRows = hasNextPage ? matchRows.slice(0, PAGE_SIZE) : matchRows
  const nextRow = hasNextPage ? pageRows.at(-1) : null

  const matchDate = new Intl.DateTimeFormat('en-US', {
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
    year: 'numeric',
  })

  return {
    props: {
      displayName: user.displayName || user.name,
      heroPerformance,
      image: user.image,
      matches: pageRows.map((match) => {
        const hero = match.hero_name ? heroPresentation.get(match.hero_name) : null
        return {
          createdAt: match.created_at.toISOString(),
          dateLabel: matchDate.format(match.created_at),
          heroImage: hero?.heroImage ?? null,
          heroName: hero?.heroName ?? 'Unknown hero',
          isDoubleDown: match.is_doubledown,
          kda: readKda(match.kda),
          matchId: match.matchId,
          queueLabel: formatQueueLabel({
            gameMode: match.game_mode,
            isParty: match.is_party,
            lobbyType: match.lobby_type,
          }),
          score: formatStreamerScore({
            direScore: match.dire_score,
            myTeam: match.myTeam,
            radiantScore: match.radiant_score,
          }),
          won: match.won === true,
        }
      }),
      nextCursor: nextRow
        ? encodeMatchHistoryCursor({
            createdAt: nextRow.created_at.toISOString(),
            id: nextRow.id,
          })
        : null,
      oldestTrackedLabel: oldestTracked ? matchDate.format(oldestTracked.created_at) : null,
      period,
      summary,
      username: user.name,
      view,
    },
  }
}

export default MatchHistoryPage
