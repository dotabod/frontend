import Link from 'next/link'
import type { FC } from 'react'
import { Badge } from '@/components/Badge'
import { getRankDetail, getRankImage, type StreamerTier } from '@/lib/ranks'

export interface StreamerSummary {
  name: string
  displayName: string | null
  image: string | null
  mmr: number
  followers: number | null
  standing: number | null
  tier: StreamerTier
  isLive: boolean
  // Relative time since the streamer's most recent tracked match (e.g. "3h ago"), shown on
  // offline cards so the roster reads as recently-active rather than stale. Null when live.
  lastMatchLabel: string | null
}

const DEFAULT_AVATAR = '/images/hero/default.png'

export const StreamerCard: FC<{ streamer: StreamerSummary }> = ({ streamer }) => {
  const { name, displayName, image, mmr, standing, isLive, lastMatchLabel } = streamer
  const rank = getRankDetail(mmr, standing)
  const medal = rank ? getRankImage(rank as Parameters<typeof getRankImage>[0]) : null
  const label = displayName || name

  return (
    <div className='group relative flex flex-col rounded-lg border border-transparent bg-gray-900 p-4 shadow-lg transition-colors duration-200 hover:border-gray-600 motion-safe:hover:shadow-gray-500/10'>
      <div className='flex items-start gap-3'>
        <div className='flex-shrink-0'>
          <img
            src={image || DEFAULT_AVATAR}
            onError={(e) => {
              e.currentTarget.src = DEFAULT_AVATAR
            }}
            alt=''
            width={56}
            height={56}
            className={`h-14 w-14 rounded-full object-cover ring-2 ${
              isLive ? 'ring-red-500/60' : 'ring-gray-700'
            }`}
          />
        </div>

        <div className='min-w-0 flex-grow'>
          <div className='flex items-center gap-2'>
            <Link
              href={`/${name}`}
              className='truncate font-medium text-gray-100! after:absolute after:inset-0 hover:text-gray-100'
            >
              {label}
            </Link>
            {isLive && (
              <span className='flex flex-shrink-0 items-center gap-1 rounded-md bg-red-700 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-white'>
                <span className='h-1.5 w-1.5 rounded-full bg-white motion-safe:animate-pulse' />
                Live
              </span>
            )}
          </div>
          <p className='truncate text-xs text-gray-400'>@{name}</p>
          {!isLive && lastMatchLabel && (
            <p className='truncate text-xs text-gray-500'>Last played {lastMatchLabel}</p>
          )}
        </div>
      </div>

      <div className='mt-4 flex items-center justify-between gap-3'>
        <div className='flex min-h-8 items-center gap-2'>
          {medal?.image ? (
            <Badge
              image={medal.image}
              alt='Rank medal'
              width={32}
              height={32}
              priority={false}
              className='h-8 w-8 flex-shrink-0 object-contain'
            />
          ) : null}
          <div className='leading-tight'>
            {standing ? (
              <span className='text-sm font-medium text-gray-200'>Immortal #{standing}</span>
            ) : mmr > 0 ? (
              <span className='text-sm font-medium text-gray-200'>{mmr.toLocaleString()} MMR</span>
            ) : (
              <span className='text-sm text-gray-500'>Unranked</span>
            )}
          </div>
        </div>

        <a
          href={`https://twitch.tv/${name}`}
          target='_blank'
          rel='noopener noreferrer'
          className='relative z-10 flex min-h-11 flex-shrink-0 items-center rounded-md bg-purple-800 px-4 text-sm font-medium text-gray-100 transition-colors duration-200 hover:bg-purple-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-400 sm:min-h-0 sm:px-3 sm:py-1.5 sm:text-xs'
        >
          Watch
        </a>
      </div>
    </div>
  )
}
