import { ArrowUpRight } from 'lucide-react'
import Link from 'next/link'

import type { HeroPerformance, MatchHistoryRow } from '@/lib/match-history'

const OVERVIEW_ROW_LIMIT = 5
const DOTABOD_ORIGIN = 'https://dotabod.com'
const TWITCH_USERNAME_PATTERN = /^[a-z0-9_]{1,25}$/iu

const profileMatchesLink = (username: string, view?: 'heroes'): string => {
  if (!TWITCH_USERNAME_PATTERN.test(username)) {
    return '/'
  }

  const url = new URL(`/${encodeURIComponent(username)}/matches`, DOTABOD_ORIGIN)
  if (url.origin !== DOTABOD_ORIGIN || url.protocol !== 'https:') {
    return '/'
  }

  if (view !== undefined) {
    url.searchParams.set('view', view)
  }

  return `${url.pathname}${url.search}`
}

const SectionLink = ({ href, label }: { href: string; label: string }) => (
  <Link
    href={href}
    aria-label={label}
    className='inline-flex items-center gap-1 text-sm font-medium text-purple-300! transition-colors hover:text-purple-200! focus-visible:outline-2! focus-visible:outline-offset-2 focus-visible:outline-purple-400'
  >
    View all
    <ArrowUpRight size={14} aria-hidden />
  </Link>
)

const HeroOverview = ({ heroes, username }: { heroes: HeroPerformance[]; username: string }) => {
  const visibleHeroes = heroes.slice(0, OVERVIEW_ROW_LIMIT)

  return (
    <section aria-labelledby='most-played-heroes-heading'>
      <div className='mb-4 flex items-end justify-between gap-4'>
        <div className='flex flex-wrap items-baseline gap-x-3 gap-y-1'>
          <h2 id='most-played-heroes-heading' className='text-xl font-semibold text-gray-100'>
            Most played heroes
          </h2>
          <span className='text-sm text-gray-400'>All time</span>
        </div>
        <SectionLink
          href={profileMatchesLink(username, 'heroes')}
          label='View all hero win rates'
        />
      </div>

      {visibleHeroes.length === 0 ? (
        <div className='rounded-lg border border-gray-700 bg-gray-900/60 px-5 py-8 text-center'>
          <p className='font-medium text-gray-200'>No recorded hero results yet</p>
          <p className='mt-1 text-sm text-gray-400'>Hero win rates appear after a tracked match.</p>
        </div>
      ) : (
        <div className='overflow-hidden rounded-lg border border-gray-700 bg-gray-900/60'>
          <table aria-label='Most played heroes' className='w-full table-fixed'>
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
              {visibleHeroes.map((hero) => (
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
                          width={40}
                          height={40}
                          className='h-10 w-10 rounded-md object-cover'
                        />
                      ) : (
                        <span className='h-10 w-10 rounded-md bg-gray-800' aria-hidden />
                      )}
                      <span className='truncate font-medium text-gray-100'>{hero.heroName}</span>
                    </div>
                  </td>
                  <td className='col-start-2 row-start-1 block text-right text-sm text-gray-300 tabular-nums sm:table-cell sm:px-3 sm:py-3 sm:text-left sm:align-middle'>
                    <span className='sm:hidden'>{hero.matches} matches</span>
                    <span className='hidden sm:inline'>{hero.matches}</span>
                  </td>
                  <td className='col-start-1 row-start-2 block text-sm text-gray-300 tabular-nums sm:table-cell sm:px-3 sm:py-3 sm:align-middle'>
                    {hero.wins}W / {hero.losses}L
                  </td>
                  <td
                    aria-label={`Win rate ${hero.winRate}%`}
                    className='col-start-2 row-start-2 block sm:table-cell sm:px-3 sm:py-3 sm:pr-5 sm:align-middle'
                  >
                    <div className='flex items-center justify-end gap-3 sm:justify-start'>
                      <div
                        className='hidden h-1.5 w-20 overflow-hidden rounded-full bg-gray-700 sm:block'
                        aria-hidden
                      >
                        <div
                          className='h-full rounded-full bg-purple-500'
                          style={{ width: `${hero.winRate}%` }}
                        />
                      </div>
                      <span className='w-10 text-right text-sm text-gray-200 tabular-nums'>
                        {hero.winRate}%
                      </span>
                    </div>
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

const MatchOverview = ({ matches, username }: { matches: MatchHistoryRow[]; username: string }) => {
  const visibleMatches = [...matches]
    .sort((first, second) => Date.parse(second.createdAt) - Date.parse(first.createdAt))
    .slice(0, OVERVIEW_ROW_LIMIT)

  return (
    <section aria-labelledby='latest-matches-heading'>
      <div className='mb-4 flex items-end justify-between gap-4'>
        <h2 id='latest-matches-heading' className='text-xl font-semibold text-gray-100'>
          Latest matches
        </h2>
        <SectionLink href={profileMatchesLink(username)} label='View all matches' />
      </div>

      {visibleMatches.length === 0 ? (
        <div className='rounded-lg border border-gray-700 bg-gray-900/60 px-5 py-8 text-center'>
          <p className='font-medium text-gray-200'>No recorded matches yet</p>
          <p className='mt-1 text-sm text-gray-400'>
            Tracked matches appear here after the next game.
          </p>
        </div>
      ) : (
        <div className='overflow-hidden rounded-lg border border-gray-700 bg-gray-900/60'>
          <table aria-label='Latest matches' className='w-full table-fixed'>
            <thead className='hidden text-left text-xs font-medium text-gray-400 md:table-header-group'>
              <tr className='border-b border-gray-700'>
                <th scope='col' className='px-5 py-3 font-medium'>
                  Hero
                </th>
                <th scope='col' className='w-24 px-3 py-3 font-medium'>
                  Result
                </th>
                <th scope='col' className='w-44 px-3 py-3 font-medium'>
                  Queue
                </th>
                <th scope='col' className='w-36 px-3 py-3 font-medium'>
                  KDA
                </th>
                <th scope='col' className='w-24 px-3 py-3 font-medium'>
                  Score
                </th>
                <th scope='col' className='w-44 px-3 py-3 pr-5 font-medium'>
                  Match
                </th>
              </tr>
            </thead>
            <tbody className='divide-y divide-gray-800'>
              {visibleMatches.map((match) => {
                const queueLabel = `${match.queueLabel}${match.isDoubleDown ? ' · Double down' : ''}`
                return (
                  <tr
                    key={match.matchId}
                    className='grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-3 p-4 md:table-row md:p-0'
                  >
                    <td className='col-start-1 row-start-1 block min-w-0 md:table-cell md:px-5 md:py-4 md:align-middle'>
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
                          <span
                            className='h-10 w-10 flex-none rounded-md bg-gray-800'
                            aria-hidden
                          />
                        )}
                        <p className='min-w-0 truncate font-medium text-gray-100'>
                          {match.heroName}
                        </p>
                      </div>
                    </td>
                    <td className='col-start-2 row-start-1 block text-right md:table-cell md:px-3 md:py-4 md:text-left md:align-middle'>
                      <span
                        className={`inline-block rounded-md border px-2.5 py-1 text-xs font-semibold ${
                          match.won
                            ? 'border-emerald-800 bg-emerald-950/40 text-emerald-200'
                            : 'border-red-800 bg-red-950/40 text-red-200'
                        }`}
                      >
                        {match.won ? 'Win' : 'Loss'}
                      </span>
                    </td>
                    <td className='col-span-2 row-start-2 block text-sm text-gray-400 md:table-cell md:px-3 md:py-4 md:align-middle'>
                      {queueLabel}
                    </td>
                    <td className='col-start-1 row-start-3 block text-sm md:table-cell md:px-3 md:py-4 md:align-middle'>
                      <span className='mr-2 text-xs text-gray-400 md:hidden'>KDA</span>
                      <span className='text-gray-200 tabular-nums'>
                        {match.kda
                          ? `${match.kda.kills} / ${match.kda.deaths} / ${match.kda.assists}`
                          : 'Not recorded'}
                      </span>
                    </td>
                    <td className='col-start-2 row-start-3 block text-right text-sm md:table-cell md:px-3 md:py-4 md:text-left md:align-middle'>
                      <span className='mr-2 text-xs text-gray-400 md:hidden'>Score</span>
                      <span className='text-gray-300 tabular-nums'>
                        {match.score ?? 'Not recorded'}
                      </span>
                    </td>
                    <td className='col-span-2 row-start-4 block md:table-cell md:px-3 md:py-4 md:pr-5 md:align-middle'>
                      <div className='flex items-center justify-between gap-3 md:block'>
                        <time className='block text-xs text-gray-400'>{match.dateLabel}</time>
                        <a
                          href={`https://www.opendota.com/matches/${match.matchId}`}
                          target='_blank'
                          rel='noopener noreferrer'
                          aria-label={`Open match ${match.matchId} on OpenDota`}
                          className='inline-flex items-center gap-1 text-xs text-purple-300! hover:text-purple-200! focus-visible:outline-2! focus-visible:outline-offset-2 focus-visible:outline-purple-400'
                        >
                          {match.matchId}
                          <ArrowUpRight size={13} aria-hidden />
                        </a>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

export const ProfileMatchOverview = ({
  heroPerformance,
  recentMatches,
  username,
}: {
  heroPerformance: HeroPerformance[]
  recentMatches: MatchHistoryRow[]
  username: string
}) => (
  <div data-testid='profile-match-overview' className='mb-12 space-y-10 font-sans'>
    <HeroOverview heroes={heroPerformance} username={username} />
    <MatchOverview matches={recentMatches} username={username} />
  </div>
)
