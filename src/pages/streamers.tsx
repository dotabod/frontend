import type { Prisma } from '@prisma/client'
import { Empty } from 'antd'
import type { GetServerSideProps } from 'next'
import Head from 'next/head'
import type { ReactElement } from 'react'
import { Container } from '@/components/Container'
import HomepageShell from '@/components/Homepage/HomepageShell'
import type { StreamerSummary } from '@/components/Streamers/StreamerCard'
import { StreamersDirectory } from '@/components/Streamers/StreamersDirectory'
import prisma from '@/lib/db'
import { tierForRank } from '@/lib/ranks'
import type { NextPageWithLayout } from '@/pages/_app'

interface StreamersPageProps {
  live: StreamerSummary[]
  roster: StreamerSummary[]
}

type StreamAccount = { steam32Id: number; mmr: number; leaderboard_rank: number | null }

type StreamerRow = {
  name: string
  displayName: string | null
  image: string | null
  mmr: number
  followers: number | null
  steam32Id: number | null
  SteamAccount: StreamAccount[]
  matches: { updated_at: Date | null }[]
}

// Compact relative time ("just now", "3h ago", "2d ago") computed on the server against a
// single `now`, so offline cards read as recently-active without any client date use.
const formatRelativeAgo = (from: Date, now: number): string => {
  const sec = Math.max(0, Math.floor((now - from.getTime()) / 1000))
  if (sec < 60) {
    return 'just now'
  }
  const min = Math.floor(sec / 60)
  if (min < 60) {
    return `${min}m ago`
  }
  const hr = Math.floor(min / 60)
  if (hr < 24) {
    return `${hr}h ago`
  }
  const day = Math.floor(hr / 24)
  if (day < 7) {
    return `${day}d ago`
  }
  return `${Math.floor(day / 7)}w ago`
}

// Pick the leaderboard standing for a user: prefer the Steam account matching their primary
// steam32Id, otherwise the best (lowest) positive leaderboard rank across linked accounts.
const pickStanding = (accounts: StreamAccount[], steam32Id: number | null): number | null => {
  const primary = accounts.find((a) => a.steam32Id === steam32Id)?.leaderboard_rank
  if (primary && primary > 0) {
    return primary
  }
  const ranked = accounts
    .map((a) => a.leaderboard_rank)
    .filter((rank): rank is number => typeof rank === 'number' && rank > 0)
  return ranked.length > 0 ? Math.min(...ranked) : null
}

// MMR lives on SteamAccount, not users.mmr (which is 0/unknown for nearly every streamer).
// Mirror the overlay/dashboard: prefer the primary linked account, else the highest tracked
// MMR across accounts, falling back to users.mmr only when no account has one.
const pickMmr = (accounts: StreamAccount[], steam32Id: number | null, fallback: number): number => {
  const primary = accounts.find((a) => a.steam32Id === steam32Id)?.mmr
  if (primary && primary > 0) {
    return primary
  }
  const best = Math.max(0, ...accounts.map((a) => a.mmr ?? 0))
  return best > 0 ? best : fallback
}

const toSummary = (user: StreamerRow, isLive: boolean, now: number): StreamerSummary => {
  const mmr = pickMmr(user.SteamAccount, user.steam32Id, user.mmr)
  const standing = pickStanding(user.SteamAccount, user.steam32Id)
  const lastMatch = user.matches[0]?.updated_at
  return {
    name: user.name,
    displayName: user.displayName,
    image: user.image,
    mmr,
    followers: user.followers,
    standing,
    tier: tierForRank(mmr, standing),
    isLive,
    lastMatchLabel: isLive || !lastMatch ? null : formatRelativeAgo(lastMatch, now),
  }
}

const StreamersPage: NextPageWithLayout<StreamersPageProps> = ({ live, roster }) => {
  const liveCount = live.length
  const trackedCount = live.length + roster.length

  // ItemList structured data so search engines read the directory as a list of streamer
  // profiles. Capped so the markup stays small; the full roster is still in the HTML.
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'Dota 2 streamers using Dotabod',
    url: 'https://dotabod.com/streamers',
    mainEntity: {
      '@type': 'ItemList',
      itemListElement: [...live, ...roster].slice(0, 50).map((streamer, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        item: {
          '@type': 'ProfilePage',
          name: streamer.displayName || streamer.name,
          url: `https://dotabod.com/${streamer.name}`,
          ...(streamer.image ? { image: streamer.image } : {}),
        },
      })),
    },
  }

  return (
    <Container className='py-10 sm:py-14'>
      <Head>
        <script
          type='application/ld+json'
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </Head>

      <header className='mb-8'>
        <h1 className='text-3xl font-bold text-gray-100 sm:text-4xl'>Dota 2 streamers</h1>
        <p className='mt-2 max-w-2xl text-sm text-gray-400'>
          Dota 2 streamers running Dotabod, grouped by rank. Jump to your bracket to find someone at
          your level, or start at the top with the pros. The Live now section refreshes as streamers
          go live.
        </p>
        <p className='mt-3 text-sm text-gray-500'>
          {liveCount === 0
            ? 'No one is playing right now'
            : `${liveCount.toLocaleString()} ${liveCount === 1 ? 'streamer' : 'streamers'} playing now`}
          {trackedCount > 0
            ? ` · ${trackedCount.toLocaleString()} ${trackedCount === 1 ? 'streamer' : 'streamers'} tracked`
            : ''}
        </p>
      </header>

      {trackedCount === 0 ? (
        <div className='py-16'>
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              <span className='text-gray-400'>No streamers to show yet. Check back soon.</span>
            }
          />
        </div>
      ) : (
        <StreamersDirectory live={live} roster={roster} />
      )}
    </Container>
  )
}

StreamersPage.getLayout = function getLayout(page: ReactElement) {
  return (
    <HomepageShell
      seo={{
        canonicalUrl: 'https://dotabod.com/streamers',
        description:
          'Browse Dota 2 streamers using Dotabod, grouped by rank from Herald to the Immortal leaderboard. See who is live on Twitch right now and find someone at your level to watch.',
        title: 'Dota 2 streamers using Dotabod',
        // The dynamic OG image endpoint is disabled (returns 410), so point at a static asset
        // that actually renders in social cards.
        ogImage: '/images/welcome.png',
      }}
    >
      {page}
    </HomepageShell>
  )
}

export default StreamersPage

const streamerSelect = {
  name: true,
  displayName: true,
  image: true,
  mmr: true,
  followers: true,
  steam32Id: true,
  SteamAccount: {
    select: { steam32Id: true, mmr: true, leaderboard_rank: true },
  },
  // Most recent tracked match, used to show "last played" on offline cards.
  matches: {
    orderBy: { updated_at: 'desc' },
    take: 1,
    select: { updated_at: true },
  },
} satisfies Prisma.UserSelect

export const getServerSideProps: GetServerSideProps<StreamersPageProps> = async ({ res }) => {
  // Cache at the edge so crawlers and bursts of visitors hit a warm response instead of the DB.
  res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300')

  const now = Date.now()
  // Live: online AND a tracked match updated within the recency window, so we only badge
  // streamers actually playing right now (mirrors the homepage featured-users query).
  const liveMatchCutoff = new Date(now - 15 * 60 * 1000)
  // Roster: anyone opted-in who has played recently, so the page is never empty for visitors
  // or crawlers even when nobody is live.
  const recentCutoff = new Date(now - 30 * 24 * 60 * 60 * 1000)

  const liveUsers = await prisma.user.findMany({
    where: {
      stream_online: true,
      hideFromLeaderboard: false,
      bannedAt: null,
      matches: { some: { updated_at: { gte: liveMatchCutoff } } },
    },
    select: streamerSelect,
  })

  const rosterUsers = await prisma.user.findMany({
    where: {
      hideFromLeaderboard: false,
      bannedAt: null,
      // Genuinely offline: excludes anyone in the Live now section above so the two
      // sections never overlap and the "offline" label stays accurate.
      stream_online: false,
      matches: { some: { updated_at: { gte: recentCutoff } } },
    },
    orderBy: { followers: 'desc' },
    take: 300,
    select: streamerSelect,
  })

  return {
    props: {
      live: liveUsers.map((user) => toSummary(user, true, now)),
      roster: rosterUsers.map((user) => toSummary(user, false, now)),
    },
  }
}
