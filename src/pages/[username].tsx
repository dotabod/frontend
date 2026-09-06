import { Button, Empty, Input, Segmented, Skeleton, Tag, Tooltip } from 'antd'
import { BarChart3Icon, CrownIcon, ExternalLinkIcon, GiftIcon, SparklesIcon } from 'lucide-react'
import type { GetServerSideProps } from 'next'
import Head from 'next/head'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import useSWR from 'swr'
import { z } from 'zod/v4'

import { Container } from '@/components/container'
import {
  bestRarity,
  hexA,
  RARITY_META,
  RarityChip,
  rarityRank,
  STEAM_CDN,
} from '@/components/CosmeticSet'
import type { CosmeticItem } from '@/components/CosmeticSet'
import CommandDetail from '@/components/Dashboard/command-detail'
import CommandsCard from '@/components/Dashboard/Features/commands-card'
import HomepageShell from '@/components/Homepage/homepage-shell'
import { ProfileMatchOverview } from '@/components/profile-match-overview'
import { ProfileWinLossCounter } from '@/components/profile-win-loss-counter'
import prisma from '@/lib/db'
import { fetcher } from '@/lib/fetcher'
import { useGetSettingsByUsername } from '@/lib/hooks/use-update-setting'
import { serializeJsonLd } from '@/lib/json-ld'
import type { ProfileJsonLd } from '@/lib/json-ld'
import {
  buildHeroPerformance,
  formatQueueLabel,
  formatStreamerScore,
  readKda,
} from '@/lib/match-history'
import type { HeroPerformance, MatchHistoryRow } from '@/lib/match-history'
import { getValueOrDefault } from '@/lib/settings'
import { createGiftLink } from '@/utils/gift-links'
import { getSubscription } from '@/utils/subscription'

const commandKeys = Object.keys(CommandDetail) as (keyof typeof CommandDetail)[]
const TWITCH_LOGIN_PATTERN = /^[a-z0-9_]{1,25}$/u
const profileUsernameSchema = z.string().trim().toLowerCase().regex(TWITCH_LOGIN_PATTERN)

const getProfileUsername = (username: string | undefined): string | null => {
  const parsedUsername = profileUsernameSchema.safeParse(username)
  return parsedUsername.success ? parsedUsername.data : null
}

const getProfileRoute = (username: string | undefined, suffix: '/matches' | '/set') => {
  const profileUsername = getProfileUsername(username)
  return profileUsername === null
    ? '/streamers'
    : `/${encodeURIComponent(profileUsername)}${suffix}`
}

interface CollectionSummary {
  count: number
  // A few of the rarest heroes, for the fanned hand.
  cards: {
    heroId: number
    heroName: string
    heroImg: string | null
    // null (not undefined): undefined is unserializable from getStaticProps.
    bestRarity: string | null
  }[]
  // Trophy rarities across the whole collection, rarest first.
  tally: { rarity: string; count: number }[]
}

// The discovery hook on the main page: a held hand of the streamer's rarest hero cards
// that spreads on hover. One link into the collection (no nested anchors), so the cards
// stay purely presentational here.
const FannedHand = ({
  username,
  collection,
}: {
  username: string
  collection: CollectionSummary
}) => {
  const cards = collection.cards.slice(0, 5)
  const mid = (cards.length - 1) / 2
  return (
    <Link
      href={getProfileRoute(username, '/set')}
      aria-label={`${collection.count} heroes collected, open collection`}
      className='group/fan block flex-shrink-0 self-center focus-visible:outline-none sm:basis-full lg:basis-auto'
    >
      <div className='relative mx-auto h-36 w-[260px] [--k:1] group-hover/fan:[--k:1.32]'>
        {cards.map((c, i) => {
          const offset = i - mid
          const accent = (c.bestRarity && RARITY_META[c.bestRarity]?.color) || '#9146ff'
          return (
            <div
              key={c.heroId}
              className='absolute top-1 left-1/2 h-32 w-[88px] overflow-hidden rounded-xl border bg-gray-900 shadow-lg transition-transform duration-300 ease-out'
              style={{
                borderColor: hexA(accent, 0.55),
                transform: `translateX(calc(-50% + ${offset * 26}px * var(--k))) rotate(calc(${offset * 7}deg * var(--k)))`,
                zIndex: i,
              }}
            >
              {c.heroImg && (
                <img
                  src={c.heroImg}
                  alt=''
                  aria-hidden
                  className='h-full w-full object-cover object-center'
                />
              )}
              <span
                aria-hidden
                className='absolute inset-0'
                style={{
                  background: `linear-gradient(180deg, transparent 45%, rgba(8,10,14,0.85))`,
                  boxShadow: `inset 0 0 0 1px ${hexA(accent, 0.35)}`,
                }}
              />
            </div>
          )
        })}
      </div>
      <div className='mt-4 text-center'>
        <p className='text-sm font-semibold text-white'>
          {collection.count} {collection.count === 1 ? 'hero' : 'heroes'} collected
        </p>
        {collection.tally.length > 0 && (
          <div className='mt-2 flex flex-wrap justify-center gap-1.5'>
            {collection.tally.map((t) => (
              <RarityChip key={t.rarity} rarity={t.rarity} count={t.count} />
            ))}
          </div>
        )}
        <span className='mt-2 inline-block text-sm font-medium text-purple-300 transition-colors group-hover/fan:text-purple-200'>
          Open collection →
        </span>
      </div>
    </Link>
  )
}

// The zero-state counterpart to FannedHand: faint ghost slots, an explicit "0 heroes
// collected", and a line on how the binder fills up. Keeps the feature discoverable for
// streamers who have not collected anything yet, and links into the (empty) collection.
const CollectionTeaser = ({ username, name }: { username: string; name: string }) => (
  <Link
    href={getProfileRoute(username, '/set')}
    aria-label='0 heroes collected, learn how the collection works'
    className='group/fan block flex-shrink-0 self-center focus-visible:outline-none sm:basis-full lg:basis-auto'
  >
    <div className='relative mx-auto h-36 w-[260px]'>
      {[0, 1, 2].map((i) => {
        const offset = i - 1
        return (
          <div
            key={i}
            className='absolute top-1 left-1/2 flex h-32 w-[88px] items-center justify-center rounded-xl border border-dashed border-gray-700 bg-gray-900/40 transition-transform duration-300 ease-out [--k:1] group-hover/fan:[--k:1.15]'
            style={{
              transform: `translateX(calc(-50% + ${offset * 26}px * var(--k))) rotate(calc(${offset * 7}deg * var(--k)))`,
              zIndex: i,
            }}
          >
            <SparklesIcon size={20} className='text-gray-700' aria-hidden />
          </div>
        )
      })}
    </div>
    <div className='mt-4 text-center'>
      <p className='text-sm font-semibold text-white'>0 heroes collected</p>
      <p className='mx-auto mt-1 max-w-[240px] text-xs leading-5 text-gray-400'>
        Heroes {name} plays on stream show up here.
      </p>
      <span className='mt-2 inline-block text-sm font-medium text-purple-300 transition-colors group-hover/fan:text-purple-200'>
        See how it works →
      </span>
    </div>
  </Link>
)

const FEATURED_COMMAND_KEYS = [
  'commandMmr',
  'commandWL',
  'commandHero',
  'commandNP',
  'commandLGS',
  'commandBuilds',
  'commandProfile',
  'commandDotabuff',
] as const

interface PageContentProps {
  userData?: {
    displayName: string | null
    name: string
    stream_online: boolean
    image: string | null
    createdAt: string
    mmr?: number
    twitchId: string | null
    settings: {
      key: string
      value: unknown
    }[]
  } | null
  subscriptionInfo?: {
    isPro: boolean
    isLifetime: boolean
    isGracePeriodPro: boolean
    inGracePeriod: boolean
  }
  username?: string
  collection?: CollectionSummary | null
  heroPerformance?: HeroPerformance[]
  recentMatches?: MatchHistoryRow[]
}

const PageContent = ({
  userData: ssrUserData,
  subscriptionInfo: ssrSubscriptionInfo,
  username: ssrUsername,
  collection,
  heroPerformance = [],
  recentMatches = [],
}: PageContentProps = {}) => {
  const [permission, setPermission] = useState('All')
  const [enabled, setEnabled] = useState('All')
  const [searchTerm, setSearchTerm] = useState('')
  const [openCardKey, setOpenCardKey] = useState<string | null>(null)
  const router = useRouter()
  const { username } = router.query
  const { data, loading, error, notFound } = useGetSettingsByUsername()

  const shouldFetchSub = !ssrSubscriptionInfo && typeof username === 'string' && Boolean(username)
  const { data: subData, isLoading: subLoading } = useSWR<{
    isPro?: boolean
    isLifetime?: boolean
    isGracePeriodPro?: boolean
    inGracePeriod?: boolean
  }>(shouldFetchSub ? `/api/subscription/by-username?username=${username}` : null, fetcher)

  const subscriptionInfo = {
    inGracePeriod: ssrSubscriptionInfo?.inGracePeriod ?? subData?.inGracePeriod ?? false,
    isGracePeriodPro: ssrSubscriptionInfo?.isGracePeriodPro ?? subData?.isGracePeriodPro ?? false,
    isLifetime: ssrSubscriptionInfo?.isLifetime ?? subData?.isLifetime ?? false,
    isPro: ssrSubscriptionInfo?.isPro ?? subData?.isPro ?? false,
    loading: shouldFetchSub ? subLoading : false,
  }

  // Use SSR data if available, otherwise fall back to client-side data
  const finalUserData = ssrUserData || data
  const finalLoading = ssrUserData ? false : loading
  const profile = finalUserData as {
    displayName?: string | null
    name?: string
    stream_online?: boolean
    image?: string | null
    createdAt?: string
    mmr?: number
    twitchId?: string | null
    settings?: { key: string; value: unknown }[]
    error?: unknown
  }

  useEffect(() => {
    // Only redirect to 404 if username exists in query and we've finished loading (for client-side only)
    if (!ssrUserData && username && !finalLoading && (notFound || profile?.error || error)) {
      void router.push('/404')
    }
  }, [finalLoading, profile, router, notFound, error, username, ssrUserData])

  if (finalLoading || error || !finalUserData) {
    return (
      <div className='p-6'>
        <div className='mb-12 space-y-4'>
          <div className='flex flex-row items-center space-x-2'>
            <Skeleton.Avatar active size={80} shape='circle' />
            <div className='flex-grow'>
              <div className='flex flex-row items-center space-x-4'>
                <Skeleton.Button active size='large' shape='round' />
                <Skeleton.Button active size='small' shape='round' style={{ width: 60 }} />
              </div>
              <Skeleton.Input active size='small' style={{ marginTop: 8, width: 200 }} />
            </div>
            <div>
              <div className='flex space-x-2'>
                <Skeleton.Button active size='default' shape='default' style={{ width: 140 }} />
                <Skeleton.Button active size='default' shape='default' style={{ width: 160 }} />
              </div>
            </div>
          </div>
          <Skeleton active paragraph={{ rows: 1 }} />
        </div>

        <div className='mb-4 flex max-w-full flex-wrap items-baseline gap-2 sm:gap-6'>
          <Skeleton.Button active size='default' shape='default' style={{ width: 200 }} />
          <Skeleton.Button active size='default' shape='default' style={{ width: 200 }} />
          <Skeleton.Input active size='default' style={{ width: 300 }} />
        </div>

        <div className='mb-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4'>
          {['sk1', 'sk2', 'sk3', 'sk4', 'sk5', 'sk6', 'sk7', 'sk8'].map((key) => (
            <div key={key} className='rounded-lg border border-gray-700 p-4'>
              <Skeleton active paragraph={{ rows: 3 }} />
            </div>
          ))}
        </div>
      </div>
    )
  }

  const commands = profile?.settings
    ? commandKeys.map((command) => {
        const commandDetail = CommandDetail[command]
        const isEnabled = getValueOrDefault(commandDetail.key, profile.settings)
        return { command, isEnabled: Boolean(isEnabled) }
      })
    : []

  const filteredCommands = commandKeys
    .filter((command) => {
      const commandDetail = CommandDetail[command]
      const isEnabled = getValueOrDefault(commandDetail.key, profile.settings)
      if (enabled === 'Enabled') {
        return isEnabled === true
      }
      if (enabled === 'Disabled') {
        return isEnabled === false
      }
      return true
    })
    .filter((command) => {
      const commandDetail = CommandDetail[command]
      if (permission === 'Mods') {
        return commandDetail.allowed === 'mods'
      }
      if (permission === 'Viewers') {
        return commandDetail.allowed === 'all'
      }
      return true
    })
    .filter((command) => {
      const keysToSearch = ['alias', 'title', 'description', 'cmd']
      const commandDetail = CommandDetail[command]
      return keysToSearch.some((key) => {
        const value = commandDetail[key as keyof typeof commandDetail] || ''
        if (Array.isArray(value)) {
          return value.some(
            (alias) =>
              alias.toLowerCase().includes(searchTerm) ||
              `!${alias.toLowerCase()}`.includes(searchTerm),
          )
        }
        return typeof value === 'string' && value.toLowerCase().includes(searchTerm)
      })
    })

  const enabledFeaturedCommands = FEATURED_COMMAND_KEYS.filter(
    (key) => commands.find((c) => c.command === key)?.isEnabled,
  )

  // Determine what subscription badge to show
  const getSubscriptionBadge = () => {
    if (subscriptionInfo.loading) {
      return null
    }
    if (subscriptionInfo.isPro) {
      if (subscriptionInfo.isGracePeriodPro) {
        return (
          <Tooltip title='Using Pro features during free trial period'>
            <Tag color='blue' className='flex! items-center gap-1 py-0.5'>
              <CrownIcon size={14} className='inline-block flex-shrink-0' />
              <span>Free Trial</span>
            </Tag>
          </Tooltip>
        )
      }

      if (subscriptionInfo.isLifetime) {
        return (
          <Tooltip title='Lifetime Pro Subscriber'>
            <Tag color='gold' className='flex! items-center gap-1 py-0.5'>
              <CrownIcon size={14} className='inline-block flex-shrink-0' />
              <span>Lifetime Pro</span>
            </Tag>
          </Tooltip>
        )
      }

      return (
        <Tooltip title='Pro Subscriber'>
          <Tag color='gold' className='flex! items-center gap-1 py-0.5'>
            <CrownIcon size={14} className='inline-block flex-shrink-0' />
            <span>Pro</span>
          </Tag>
        </Tooltip>
      )
    }

    return null
  }

  return (
    <>
      {/* oxlint-disable-next-line nextjs/no-duplicate-head -- conditional render path, only one Head per render */}
      <Head>
        <title>{`${finalLoading || !profile?.displayName ? '...' : profile.displayName}'s Dota 2 Commands — Dotabod`}</title>
        <meta
          name='description'
          content={`Chat commands available in ${profile?.displayName || 'this streamer'}'s Twitch channel via Dotabod.`}
        />
        {username && typeof username === 'string' && (
          <link rel='canonical' href={`https://dotabod.com/${username}`} />
        )}
        <meta
          name='robots'
          content={username === '[username]' ? 'noindex, nofollow' : 'index, follow'}
        />
      </Head>

      {/* Full-width hero */}
      <div className='relative border-b border-gray-700/50 bg-gradient-to-br from-gray-950 to-gray-800'>
        <Container className='py-10 sm:py-14'>
          <div className='flex flex-col gap-6 sm:flex-row sm:flex-wrap sm:items-start sm:gap-10 lg:flex-nowrap'>
            {/* Avatar with live ring */}
            <div className='relative flex-shrink-0 self-start'>
              <div
                className={`absolute -inset-1.5 rounded-full ${
                  profile?.stream_online ? 'animate-pulse bg-red-500/30' : 'bg-gray-600/10'
                }`}
              />
              <img
                onError={(e) => {
                  e.currentTarget.src = '/images/hero/default.png'
                }}
                src={profile?.image || '/images/hero/default.png'}
                alt='Profile'
                width={100}
                height={100}
                className='relative rounded-full ring-2 ring-gray-700'
              />
              {profile?.stream_online && (
                <span className='absolute -bottom-1 left-1/2 -translate-x-1/2 rounded-full bg-red-600 px-2 py-px text-[10px] font-bold tracking-wide text-white uppercase'>
                  Live
                </span>
              )}
            </div>

            {/* Identity, stats, CTAs */}
            <div className='min-w-0 flex-grow'>
              <div className='mb-1 flex flex-wrap items-center gap-2'>
                <h1 className='text-3xl font-bold text-white sm:text-4xl'>
                  {finalLoading || !profile?.displayName ? 'Loading...' : profile.displayName}
                </h1>
                {!profile?.stream_online && (
                  <span className='rounded-md bg-gray-700 px-2 py-0.5 text-xs text-gray-400'>
                    Offline
                  </span>
                )}
                {getSubscriptionBadge()}
              </div>

              <div className='mb-6 flex flex-wrap gap-x-5 gap-y-1 text-sm text-gray-400'>
                {profile?.mmr != null && profile.mmr > 0 && (
                  <span>⚔ {profile.mmr.toLocaleString()} MMR</span>
                )}
                <ProfileWinLossCounter twitchId={profile?.twitchId} />
                <span>
                  Using Dotabod since{' '}
                  {finalLoading || !profile?.createdAt
                    ? '...'
                    : new Date(profile.createdAt).toLocaleDateString('en-US', {
                        month: 'long',
                        year: 'numeric',
                      })}
                </span>
                {!finalLoading && commands.length > 0 && (
                  <span>{commands.filter((c) => c.isEnabled).length} commands active</span>
                )}
              </div>

              <div className='flex flex-wrap gap-3'>
                <Link
                  target='_blank'
                  href={profile ? `https://twitch.tv/${profile.name}` : ''}
                  passHref
                >
                  <Button
                    size='large'
                    icon={<ExternalLinkIcon size={16} />}
                    className='flex items-center'
                  >
                    Watch on Twitch
                  </Button>
                </Link>
                <Link
                  href={createGiftLink(
                    ssrUsername || (typeof username === 'string' ? username : ''),
                  )}
                  passHref
                >
                  <Button
                    type='primary'
                    size='large'
                    icon={<GiftIcon size={16} />}
                    className='flex items-center'
                  >
                    Gift Subscription
                  </Button>
                </Link>
                <Link
                  href={getProfileRoute(
                    ssrUsername || (typeof username === 'string' ? username : undefined),
                    '/matches',
                  )}
                  passHref
                >
                  <Button
                    size='large'
                    icon={<BarChart3Icon size={16} />}
                    className='flex items-center'
                  >
                    Match history
                  </Button>
                </Link>
              </div>
            </div>

            {collection && collection.count > 0 ? (
              <FannedHand
                username={ssrUsername || (typeof username === 'string' ? username : '')}
                collection={collection}
              />
            ) : (
              <CollectionTeaser
                username={ssrUsername || (typeof username === 'string' ? username : '')}
                name={profile?.displayName || profile?.name || 'this streamer'}
              />
            )}
          </div>
        </Container>
      </div>

      {/* Page content */}
      <Container className='py-8'>
        <ProfileMatchOverview
          heroPerformance={heroPerformance}
          recentMatches={recentMatches}
          username={ssrUsername || (typeof username === 'string' ? username : '')}
        />

        {/* Featured commands strip */}
        {!finalLoading && enabledFeaturedCommands.length > 0 && (
          <div className='mb-10'>
            <p className='mb-3 text-xs font-semibold tracking-widest text-gray-500 uppercase'>
              Popular commands
            </p>
            <div className='-mx-1 flex gap-3 overflow-x-auto px-1 pb-2'>
              {enabledFeaturedCommands.map((key) => (
                <button
                  key={key}
                  type='button'
                  onClick={() => {
                    setOpenCardKey(key)
                    setTimeout(() => {
                      document
                        .getElementById(`command-card-${key}`)
                        ?.scrollIntoView({ behavior: 'smooth', block: 'center' })
                    }, 50)
                  }}
                  className='w-48 flex-shrink-0 cursor-pointer rounded-lg border border-gray-700 bg-gray-900/80 px-4 py-3 text-left transition-colors hover:border-purple-500 hover:bg-gray-900'
                >
                  <div className='mb-1 font-mono text-sm font-semibold text-purple-400'>
                    {CommandDetail[key].cmd}
                  </div>
                  <div className='line-clamp-2 text-xs text-gray-400'>
                    {CommandDetail[key].description}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Filter bar */}
        <div className='mb-6 flex flex-wrap items-center gap-3'>
          <Segmented
            value={enabled}
            onChange={(v) => {
              setEnabled(v)
            }}
            options={['All', 'Enabled', 'Disabled']}
          />
          <Segmented
            value={permission}
            onChange={(v) => {
              setPermission(v)
            }}
            options={['All', 'Mods', 'Viewers']}
          />
          <Input
            placeholder='Search commands...'
            value={searchTerm}
            maxLength={200}
            style={{ width: 260 }}
            onChange={(e) => {
              setSearchTerm(e.target.value.toLowerCase())
            }}
          />
          {!finalLoading && (
            <span className='ml-auto text-sm text-gray-500'>
              {filteredCommands.length} of {Object.keys(CommandDetail).length} commands
            </span>
          )}
        </div>

        {filteredCommands.length === 0 && (
          <Empty
            description={
              enabled === 'Enabled'
                ? `${finalUserData?.displayName || 'This streamer'} has no enabled commands matching your search.`
                : 'No matching commands found.'
            }
            imageStyle={{ height: 60 }}
          />
        )}

        <div className='mb-16 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4'>
          {filteredCommands.map((key) => (
            <div id={`command-card-${key}`} key={key}>
              <CommandsCard
                readonly
                id={key}
                isOpen={openCardKey === key}
                onClose={() => {
                  setOpenCardKey(null)
                }}
                publicLoading={finalLoading}
                publicIsEnabled={commands.find((c) => c.command === key)?.isEnabled}
                command={CommandDetail[key]}
              />
            </div>
          ))}
        </div>

        {/* Bottom conversion CTA */}
        <div className='mb-10 rounded-xl border border-gray-700 bg-gray-900 p-8 text-center'>
          <h2 className='mb-2 text-xl font-bold text-white'>
            Want these commands for your stream?
          </h2>
          <p className='mx-auto mb-5 max-w-md text-sm text-gray-400'>
            Dotabod adds real-time stats, automated predictions, and smart chat commands to your
            Dota 2 stream — free to get started.
          </p>
          <Link href='/dashboard'>
            <Button type='primary' size='large'>
              Set up Dotabod for free
            </Button>
          </Link>
          <p className='mt-4 text-sm'>
            <Link
              href='/streamers'
              className='font-medium text-purple-300 transition-colors hover:text-purple-200'
            >
              Browse more Dota 2 streamers →
            </Link>
          </p>
        </div>
      </Container>
    </>
  )
}

interface UserProfileProps {
  userData: {
    displayName: string | null
    name: string
    stream_online: boolean
    image: string | null
    createdAt: string
    mmr?: number
    twitchId: string | null
    settings: {
      key: string
      value: unknown
    }[]
  } | null
  subscriptionInfo: {
    isPro: boolean
    isLifetime: boolean
    isGracePeriodPro: boolean
    inGracePeriod: boolean
  }
  username: string
  collection: CollectionSummary | null
  heroPerformance: HeroPerformance[]
  recentMatches: MatchHistoryRow[]
}

const isMaintenanceModeEnabled = function isMaintenanceModeEnabled() {
  return (
    process.env.IS_IN_MAINTENANCE_MODE === 'true' ||
    process.env.NEXT_PUBLIC_IS_IN_MAINTENANCE_MODE === 'true'
  )
}

// Shape the streamer's loadouts into the fanned-hand summary: rarest few heroes plus a
// trophy tally. Heroes.json is imported here (server-only) so it stays out of the bundle.
const buildCollectionSummary = async function buildCollectionSummary(
  loadouts: { heroId: number; heroName: string; items: unknown }[],
): Promise<CollectionSummary> {
  // The count only needs the row count, so it stays reliable even if a row's items
  // JSON is malformed. The decorative cards/tally are best-effort below.
  const count = loadouts.length
  if (!count) {
    return { count: 0, cards: [], tally: [] }
  }

  // A row's items can be null or a non-array shape from an older/partial capture;
  // coerce so a bad row can never throw and 404 the whole profile page.
  const itemsOf = (items: unknown): CosmeticItem[] =>
    Array.isArray(items) ? (items as CosmeticItem[]) : []

  try {
    const heroes = (await import('dotaconstants/build/heroes.json')).default as Record<
      string,
      { img?: string }
    >

    const cards = loadouts
      .map((l) => {
        const img = heroes[String(l.heroId)]?.img
        return {
          bestRarity: bestRarity(itemsOf(l.items)) ?? null,
          heroId: l.heroId,
          heroImg: img ? `${STEAM_CDN}${img}` : null,
          heroName: l.heroName,
        }
      })
      .sort(
        (a, b) =>
          (b.bestRarity ? (RARITY_META[b.bestRarity]?.rank ?? -1) : -1) -
          (a.bestRarity ? (RARITY_META[a.bestRarity]?.rank ?? -1) : -1),
      )
      .slice(0, 5)

    const tallyCounts = new Map<string, number>()
    for (const l of loadouts) {
      for (const item of itemsOf(l.items)) {
        if (rarityRank(item) >= 4) {
          tallyCounts.set(item.rarity as string, (tallyCounts.get(item.rarity as string) ?? 0) + 1)
        }
      }
    }
    const tally = [...tallyCounts.entries()]
      .map(([rarity, count]) => ({ count, rarity }))
      .sort((a, b) => (RARITY_META[b.rarity]?.rank ?? 0) - (RARITY_META[a.rarity]?.rank ?? 0))
      .slice(0, 3)

    return { cards, count, tally }
  } catch (error) {
    // Never let cosmetic shaping break the page — fall back to the bare count.
    console.error('Error building collection summary:', error)
    return { cards: [], count, tally: [] }
  }
}

const CommandsPage = ({
  userData,
  subscriptionInfo,
  username,
  collection,
  heroPerformance,
  recentMatches,
}: UserProfileProps) => {
  // If no user data, show 404
  if (!userData) {
    return (
      <HomepageShell>
        <div className='p-6'>
          <Empty description='User not found' />
        </div>
      </HomepageShell>
    )
  }

  const pageTitle = `${userData.displayName || userData.name} - ${userData.mmr || 0} MMR | Dotabod`
  const pageDescription = `View ${userData.displayName || userData.name}'s Dota 2 commands and stream stats on Dotabod. ${userData.stream_online ? 'Currently live streaming!' : 'Stream offline.'}`

  const profileJsonLd: ProfileJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ProfilePage',
    mainEntity: {
      '@type': 'Person',
      name: userData.displayName || userData.name,
      url: `https://twitch.tv/${userData.name}`,
    },
    url: `https://dotabod.com/${username}`,
  }
  if (userData.image !== null && userData.image !== '') {
    profileJsonLd.mainEntity.image = userData.image
  }
  const profileJsonLdText = serializeJsonLd(profileJsonLd)

  return (
    <>
      <Head>
        <title>{pageTitle}</title>
        <meta name='description' content={pageDescription} />
        <meta property='og:title' content={pageTitle} />
        <meta property='og:description' content={pageDescription} />
        <meta property='og:image' content={userData.image || '/images/hero/default.png'} />
        <meta property='og:url' content={`https://dotabod.com/${username}`} />
        <meta property='twitter:card' content='summary_large_image' />
        <meta property='twitter:title' content={pageTitle} />
        <meta property='twitter:description' content={pageDescription} />
        <meta property='twitter:image' content={userData.image || '/images/hero/default.png'} />
        <link rel='canonical' href={`https://dotabod.com/${username}`} />
        <script type='application/ld+json'>{profileJsonLdText}</script>
      </Head>
      <HomepageShell
        dontUseTitle
        ogImage={{
          subtitle: 'Commands and settings available for this streamer.',
          title: userData.displayName || userData.name,
        }}
      >
        <PageContent
          userData={userData}
          subscriptionInfo={subscriptionInfo}
          username={username}
          collection={collection}
          heroPerformance={heroPerformance}
          recentMatches={recentMatches}
        />
      </HomepageShell>
    </>
  )
}

export const getServerSideProps: GetServerSideProps<UserProfileProps> = async ({ params, res }) => {
  // Cache at the edge instead of ISR: with ~30k profile pages swept mostly by crawlers,
  // ISR writes cost more than they save. Stale-while-revalidate keeps repeat hits warm.
  res.setHeader('Cache-Control', 'public, s-maxage=600, stale-while-revalidate=86400')

  const parsedUsername = profileUsernameSchema.safeParse(params?.username)
  const username = parsedUsername.success ? parsedUsername.data : null

  if (isMaintenanceModeEnabled()) {
    return {
      redirect: {
        destination: '/maintenance',
        permanent: false,
      },
    }
  }

  if (username === null) {
    return { notFound: true }
  }

  try {
    // Fetch user data
    const userData = await prisma.user.findFirst({
      select: {
        Account: {
          select: {
            providerAccountId: true,
          },
        },
        cosmeticLoadouts: {
          select: { heroId: true, heroName: true, items: true, updatedAt: true },
        },
        createdAt: true,
        displayName: true,
        id: true,
        image: true,
        mmr: true,
        name: true,
        settings: {
          select: {
            key: true,
            value: true,
          },
          where: {
            key: {
              startsWith: 'command',
            },
          },
        },
        stream_online: true,
      },
      where: {
        name: username.toLowerCase(),
      },
    })

    if (!userData) {
      return { notFound: true }
    }

    const [collection, subscription, groups, recentMatchRows, heroesModule] = await Promise.all([
      buildCollectionSummary(userData.cosmeticLoadouts),
      getSubscription(userData.id),
      prisma.matches.groupBy({
        _count: { _all: true },
        by: ['hero_name', 'won'],
        where: { userId: userData.id, won: { not: null } },
      }),
      prisma.matches.findMany({
        orderBy: [{ created_at: 'desc' }, { id: 'desc' }],
        select: {
          created_at: true,
          dire_score: true,
          game_mode: true,
          hero_name: true,
          is_doubledown: true,
          is_party: true,
          kda: true,
          lobby_type: true,
          matchId: true,
          myTeam: true,
          radiant_score: true,
          won: true,
        },
        take: 5,
        where: { userId: userData.id, won: { not: null } },
      }),
      import('dotaconstants/build/heroes.json'),
    ])

    const resultGroups = groups.map((group) => ({
      count: group._count._all,
      heroName: group.hero_name,
      won: group.won,
    }))
    const heroes = heroesModule.default as Record<
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
    const matchDate = new Intl.DateTimeFormat('en-US', {
      day: 'numeric',
      month: 'short',
      timeZone: 'UTC',
      year: 'numeric',
    })
    const recentMatches = recentMatchRows.map((match) => {
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
    })

    const subscriptionInfo = {
      inGracePeriod: false,
      isGracePeriodPro: false,
      isLifetime: subscription?.transactionType === 'LIFETIME',
      isPro: subscription?.tier === 'PRO',
    }

    return {
      props: {
        collection,
        heroPerformance,
        recentMatches,
        subscriptionInfo,
        userData: {
          createdAt: userData.createdAt.toISOString(),
          displayName: userData.displayName,
          image: userData.image,
          mmr: userData.mmr,
          name: userData.name,
          settings: userData.settings,
          stream_online: userData.stream_online,
          twitchId: userData.Account?.providerAccountId ?? null,
        },
        username: username.toLowerCase(),
      },
    }
  } catch (error) {
    console.error('Error fetching user data:', error)
    return { notFound: true }
  }
}

export default CommandsPage
