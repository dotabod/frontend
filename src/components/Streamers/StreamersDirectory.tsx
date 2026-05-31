import { Select } from 'antd'
import { useEffect, useMemo, useRef, useState } from 'react'
import { StreamerCard, type StreamerSummary } from '@/components/Streamers/StreamerCard'
import {
  type StreamerTier,
  tierDisplayOrder,
  tierEmblem,
  tierLabel,
  tierRangeLabel,
} from '@/lib/ranks'

export type SortKey = 'mmr_desc' | 'mmr_asc' | 'followers_desc'

const sortOptions: { label: string; value: SortKey }[] = [
  { label: 'MMR: high to low', value: 'mmr_desc' },
  { label: 'MMR: low to high', value: 'mmr_asc' },
  { label: 'Most followers', value: 'followers_desc' },
]

const comparators: Record<SortKey, (a: StreamerSummary, b: StreamerSummary) => number> = {
  mmr_desc: (a, b) => b.mmr - a.mmr,
  mmr_asc: (a, b) => a.mmr - b.mmr,
  followers_desc: (a, b) => (b.followers ?? -1) - (a.followers ?? -1),
}

// Immortal sorts by standing (best first) regardless of the chosen MMR sort, since the
// leaderboard number is the meaningful ranking there.
const immortalComparator = (a: StreamerSummary, b: StreamerSummary): number => {
  const sa = a.standing ?? Number.POSITIVE_INFINITY
  const sb = b.standing ?? Number.POSITIVE_INFINITY
  if (sa !== sb) {
    return sa - sb
  }
  return b.mmr - a.mmr
}

interface Group {
  tier: StreamerTier
  streamers: StreamerSummary[]
}

const buildGroups = (streamers: StreamerSummary[], sort: SortKey): Group[] => {
  const byTier = new Map<StreamerTier, StreamerSummary[]>()
  for (const streamer of streamers) {
    const bucket = byTier.get(streamer.tier)
    if (bucket) {
      bucket.push(streamer)
    } else {
      byTier.set(streamer.tier, [streamer])
    }
  }
  return tierDisplayOrder
    .filter((tier) => byTier.has(tier))
    .map((tier) => ({
      tier,
      streamers: byTier
        .get(tier)!
        .slice()
        .sort(tier === 'immortal' ? immortalComparator : comparators[sort]),
    }))
}

// One rank bucket: emblem + label header, then a responsive grid of cards. The roster view
// passes a sectionRef so the jump rail can scroll to and highlight it; the "Live now" view
// passes none. Heading ids are namespaced (idPrefix) to stay unique across both views.
const TierGroupSection = ({
  group,
  idPrefix,
  railHeight,
  sectionRef,
}: {
  group: Group
  idPrefix: string
  railHeight: number
  sectionRef?: (el: HTMLElement | null) => void
}) => {
  const headingId = `${idPrefix}tier-${group.tier}`
  return (
    <section
      data-tier={sectionRef ? group.tier : undefined}
      ref={sectionRef}
      style={{ scrollMarginTop: railHeight + 16 }}
      aria-labelledby={headingId}
    >
      <div className='mb-5 flex items-center gap-3 border-b border-gray-800 pb-3'>
        <img
          src={`/images/ranks/${tierEmblem[group.tier]}`}
          alt=''
          width={36}
          height={36}
          className='h-9 w-9 flex-shrink-0 object-contain'
        />
        <div className='flex-1'>
          <h3 id={headingId} className='text-lg font-semibold leading-tight text-gray-100'>
            {tierLabel[group.tier]}
          </h3>
          <p className='text-xs text-gray-500'>{tierRangeLabel(group.tier)}</p>
        </div>
        <span className='text-sm tabular-nums text-gray-400'>{group.streamers.length}</span>
      </div>
      <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'>
        {group.streamers.map((streamer) => (
          <StreamerCard key={streamer.name} streamer={streamer} />
        ))}
      </div>
    </section>
  )
}

export const StreamersDirectory = ({
  live,
  roster,
}: {
  live: StreamerSummary[]
  roster: StreamerSummary[]
}) => {
  const [sort, setSort] = useState<SortKey>('mmr_desc')
  const [activeTier, setActiveTier] = useState<StreamerTier | null>(null)

  // The sticky rail grows taller as the pills wrap onto more rows, so its height is measured
  // rather than assumed: it sets both the scroll-into-view offset and the scroll-spy trigger
  // line. Without this, jumping to a tier leaves its header hidden behind the wrapped rail.
  const railRef = useRef<HTMLDivElement>(null)
  const [railHeight, setRailHeight] = useState(0)
  useEffect(() => {
    const el = railRef.current
    if (!el) {
      return
    }
    const observer = new ResizeObserver(() => setRailHeight(el.offsetHeight))
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const liveGroups = useMemo<Group[]>(() => buildGroups(live, sort), [live, sort])
  const rosterGroups = useMemo<Group[]>(() => buildGroups(roster, sort), [roster, sort])

  // Scroll-spy: highlight the roster tier whose section is nearest the top of the viewport.
  const sectionRefs = useRef(new Map<StreamerTier, HTMLElement>())
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
        if (visible[0]) {
          setActiveTier(visible[0].target.getAttribute('data-tier') as StreamerTier)
        }
      },
      // Bias the trigger line just below the sticky rail so the active chip flips as a
      // section header reaches it, not when it barely enters the viewport.
      { rootMargin: `-${railHeight + 8}px 0px -65% 0px`, threshold: 0 },
    )
    for (const el of sectionRefs.current.values()) {
      observer.observe(el)
    }
    return () => observer.disconnect()
  }, [rosterGroups, railHeight])

  const jumpTo = (tier: StreamerTier) => {
    const el = sectionRefs.current.get(tier)
    if (!el) {
      return
    }
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' })
    setActiveTier(tier)
  }

  return (
    <>
      {/* Currently live streamers, grouped by rank, sitting above the full directory so
          they're the first thing visitors see when anyone is playing. */}
      {liveGroups.length > 0 && (
        <section aria-labelledby='live-now-heading' className='mb-14'>
          <h2 id='live-now-heading' className='mb-6 text-xl font-bold text-gray-100'>
            Live now
          </h2>
          <div className='space-y-12'>
            {liveGroups.map((group) => (
              <TierGroupSection
                key={group.tier}
                group={group}
                idPrefix='live-'
                railHeight={railHeight}
              />
            ))}
          </div>
        </section>
      )}

      <h2 className='mb-1 text-xl font-bold text-gray-100'>Browse offline streamers by rank</h2>
      <p className='mb-6 text-sm text-gray-500'>
        Recently active streamers who aren&apos;t live right now. Jump to your bracket to find
        someone to follow.
      </p>

      {/* Sticky rank rail: jump-nav with per-rank counts for the full roster below.
          On phones it spans edge to edge and the pills wrap onto multiple rows; on pointer
          screens it becomes a bordered panel sharing a row with the sort control. */}
      <div
        ref={railRef}
        className='sticky top-0 z-20 -mx-4 mb-8 border-b border-gray-800 bg-gray-900/95 px-4 py-2 backdrop-blur-sm sm:mx-0 sm:mb-10 sm:rounded-lg sm:border sm:px-3 sm:py-3'
      >
        <div className='flex min-w-0 items-center gap-3'>
          {/* Pills wrap instead of scrolling so every rank stays visible on a phone;
              min-w-0 lets this flex child shrink to the viewport width. */}
          <nav
            aria-label='Jump to rank'
            className='-my-1 flex min-w-0 flex-1 flex-wrap gap-1.5 py-1'
          >
            {rosterGroups.map(({ tier, streamers: group }) => {
              const active = activeTier === tier
              return (
                <button
                  key={tier}
                  type='button'
                  onClick={() => jumpTo(tier)}
                  aria-current={active ? 'true' : undefined}
                  className={`group flex min-h-9 flex-shrink-0 items-center gap-1.5 rounded-full border px-3 py-2 text-sm font-medium transition-colors duration-200 sm:min-h-0 sm:px-2.5 sm:py-1 sm:text-xs ${
                    active
                      ? 'border-purple-500/60 bg-purple-500/15 text-purple-200'
                      : 'border-transparent bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-gray-100'
                  }`}
                >
                  <img
                    src={`/images/ranks/${tierEmblem[tier]}`}
                    alt=''
                    width={18}
                    height={18}
                    className='h-[18px] w-[18px] flex-shrink-0 object-contain'
                  />
                  <span>{tierLabel[tier]}</span>
                  <span
                    className={`tabular-nums ${active ? 'text-purple-300/80' : 'text-gray-500'}`}
                  >
                    {group.length}
                  </span>
                </button>
              )
            })}
          </nav>
          <Select<SortKey>
            value={sort}
            onChange={setSort}
            options={sortOptions}
            size='small'
            variant='borderless'
            className='hidden flex-shrink-0 sm:block'
            style={{ width: 168 }}
            aria-label='Sort streamers within each rank'
          />
        </div>
      </div>

      {/* Mobile sort, below the rail so the rank pills get full width up top. Large size
          gives it a 40px touch target; the label clarifies the bare control. */}
      <div className='mb-8 flex items-center justify-end gap-2 sm:hidden'>
        <span className='text-xs text-gray-500'>Sort</span>
        <Select<SortKey>
          value={sort}
          onChange={setSort}
          options={sortOptions}
          size='large'
          aria-label='Sort streamers within each rank'
          popupMatchSelectWidth={false}
          className='w-48'
        />
      </div>

      <div className='space-y-12'>
        {rosterGroups.map((group) => (
          <TierGroupSection
            key={group.tier}
            group={group}
            idPrefix=''
            railHeight={railHeight}
            sectionRef={(el) => {
              if (el) {
                sectionRefs.current.set(group.tier, el)
              } else {
                sectionRefs.current.delete(group.tier)
              }
            }}
          />
        ))}
      </div>
    </>
  )
}
