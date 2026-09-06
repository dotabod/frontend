import { useMemo, useState } from 'react'

import ErrorBoundary from '@/components/error-boundary'
import { groupWhatsNewByDate } from '@/lib/whats-new'
import type { WhatsNewEntry } from '@/lib/whats-new'
import { formatDate } from '@/utils/format-date'

import WhatsNewFeatureCard from './whats-new-feature-card'

type FeedFilter = 'all' | 'chat' | 'stream' | 'dashboard' | 'pages'

const FILTERS: {
  id: FeedFilter
  label: string
  categories?: WhatsNewEntry['category'][]
}[] = [
  { id: 'all', label: 'All updates' },
  { categories: ['chat', 'commands'], id: 'chat', label: 'Chat & commands' },
  { categories: ['overlay', 'stream', 'bets', 'mmr'], id: 'stream', label: 'Stream tools' },
  { categories: ['advanced'], id: 'dashboard', label: 'Dashboard & billing' },
  { categories: ['pages'], id: 'pages', label: 'Public pages' },
]

const entriesForFilter = function entriesForFilter(entries: WhatsNewEntry[], filter: FeedFilter) {
  const categories = FILTERS.find((option) => option.id === filter)?.categories
  return categories ? entries.filter((entry) => categories.includes(entry.category)) : entries
}

export default function WhatsNewFeed({
  entries,
  master,
  readOnly,
}: {
  entries: WhatsNewEntry[]
  master?: boolean
  readOnly?: boolean
}) {
  const [activeFilter, setActiveFilter] = useState<FeedFilter>('all')
  const visibleFilters = useMemo(
    () =>
      FILTERS.filter(
        (filter) => filter.id === 'all' || entriesForFilter(entries, filter.id).length > 0,
      ),
    [entries],
  )
  const visibleEntries = useMemo(
    () => entriesForFilter(entries, activeFilter),
    [activeFilter, entries],
  )
  const groups = useMemo(() => groupWhatsNewByDate(visibleEntries), [visibleEntries])
  const latestEntryId = entries[0]?.id
  const updateCountLabel = `${visibleEntries.length} ${visibleEntries.length === 1 ? 'update' : 'updates'}`

  return (
    <div>
      <div className='mb-10 border-y border-gray-700 py-3'>
        <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
          <div className='grid grid-cols-2 gap-2 sm:flex sm:flex-wrap' aria-label='Filter updates'>
            {visibleFilters.map((filter) => {
              const selected = activeFilter === filter.id
              const count = entriesForFilter(entries, filter.id).length

              return (
                <button
                  key={filter.id}
                  type='button'
                  aria-label={filter.label}
                  aria-pressed={selected}
                  onClick={() => {
                    setActiveFilter(filter.id)
                  }}
                  className={`flex items-center justify-between gap-2 rounded-md border px-3 py-1.5 text-left text-sm font-medium transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-400 ${
                    selected
                      ? 'border-gray-500 bg-gray-700 text-gray-100'
                      : 'border-transparent text-gray-400 hover:border-gray-700 hover:bg-gray-900 hover:text-gray-200'
                  }`}
                >
                  <span>{filter.label}</span>
                  <span
                    aria-hidden='true'
                    className={`ml-2 text-xs ${selected ? 'text-gray-300' : 'text-gray-400'}`}
                  >
                    {count}
                  </span>
                </button>
              )
            })}
          </div>
          <p className='m-0! shrink-0 text-sm text-gray-400' aria-live='polite'>
            {updateCountLabel}
          </p>
        </div>
      </div>

      <div className='space-y-14'>
        {groups.map((group) => {
          const [monthAndDay, year] = formatDate(group.releaseDate).split(', ')

          return (
            <section
              key={group.releaseDate}
              aria-labelledby={`release-${group.releaseDate}`}
              className='grid gap-5 md:grid-cols-[9.5rem_minmax(0,1fr)] md:gap-8'
            >
              <div>
                <h2
                  id={`release-${group.releaseDate}`}
                  className='m-0! text-sm font-semibold text-gray-200 md:sticky md:top-6'
                >
                  <time dateTime={group.releaseDate}>
                    <span>{monthAndDay},</span>{' '}
                    <span className='mt-1 block text-xs font-normal text-gray-400'>{year}</span>
                  </time>
                </h2>
              </div>

              <div className='space-y-5'>
                {group.entries.map((entry) => (
                  <ErrorBoundary key={entry.id}>
                    <WhatsNewFeatureCard
                      entry={entry}
                      latest={entry.id === latestEntryId}
                      master={master}
                      readOnly={readOnly}
                      showDate={false}
                    />
                  </ErrorBoundary>
                ))}
              </div>
            </section>
          )
        })}
      </div>
    </div>
  )
}
