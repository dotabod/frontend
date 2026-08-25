import Link from 'next/link'
import CommandDetail from '@/components/Dashboard/CommandDetail'
import { useUpdateSetting } from '@/lib/hooks/useUpdateSetting'
import { deepLinkLabel, entryToggleChecked, type WhatsNewEntry } from '@/lib/whatsNew'
import { formatDate } from '@/utils/formatDate'
import { TierSwitch } from './TierSwitch'

const CATEGORY_LABELS: Record<WhatsNewEntry['category'], string> = {
  advanced: 'Dashboard',
  bets: 'Predictions',
  chat: 'Chat',
  commands: 'Commands',
  mmr: 'MMR',
  overlay: 'Overlay',
  pages: 'Public page',
  stream: 'Stream setup',
}

// One feature in the release feed. The public route renders it read-only; the dashboard adds
// an inline control only when that release owns a setting.
export default function WhatsNewFeatureCard({
  entry,
  master,
  latest,
  readOnly,
  showDate = true,
}: {
  entry: WhatsNewEntry
  master?: boolean
  latest?: boolean
  readOnly?: boolean
  showDate?: boolean
}) {
  // Always call the hook (rules of hooks); it no-ops when there's no settingKey.
  const { data: value, updateSetting } = useUpdateSetting<boolean | null>(entry.settingKey)
  const checked = entryToggleChecked(entry, value, master)
  const hasFooter =
    (!readOnly && Boolean(entry.settingKey)) ||
    Boolean(entry.deepLink) ||
    Boolean(entry.blogSlug) ||
    Boolean(entry.docsUrl)
  const titleId = `${entry.id}-title`

  return (
    <article
      id={entry.id}
      aria-labelledby={titleId}
      className={`scroll-mt-6 rounded-lg border bg-gray-900 p-5 shadow-lg transition-colors duration-200 sm:p-6 ${
        latest ? 'border-purple-500/40' : 'border-gray-700/80 hover:border-gray-600'
      }`}
    >
      <div className='flex flex-wrap items-center gap-2 text-xs text-gray-400'>
        <span className='rounded-full border border-gray-700 bg-gray-800 px-2.5 py-1 font-medium text-gray-300'>
          {CATEGORY_LABELS[entry.category]}
        </span>
        {showDate && <time dateTime={entry.releaseDate}>{formatDate(entry.releaseDate)}</time>}
        {latest && (
          <span className='rounded-full border border-purple-500/40 bg-purple-950/40 px-2.5 py-1 font-medium text-purple-200'>
            Latest release
          </span>
        )}
        {entry.tier && (
          <span className='rounded-full border border-gray-700 px-2.5 py-1 font-medium text-gray-300'>
            {entry.tier === 'FREE' ? 'Free' : 'Pro'}
          </span>
        )}
        {entry.command && (
          <code className='rounded-md border border-gray-700 bg-gray-800 px-2 py-1 text-gray-200'>
            {entry.command}
          </code>
        )}
      </div>

      <div className='mt-4 max-w-3xl'>
        <h3 id={titleId} className='m-0! text-lg font-semibold leading-7 text-gray-100'>
          {entry.title}
        </h3>
        <p className='mt-2 mb-0! text-sm leading-6 text-gray-300'>{entry.description}</p>
      </div>

      {(entry.demoCommand || entry.demo?.chat || entry.demo?.exampleUrl) && (
        <div className='mt-5 rounded-md border border-gray-700 bg-gray-950/40 p-4'>
          {(entry.demoCommand || entry.demo?.chat) && (
            <div className='mb-2 text-xs font-medium text-gray-400'>Example in chat</div>
          )}
          <div className='whats-new-command-demo text-sm text-gray-300'>
            {entry.demoCommand ? (
              // Reuse the real command sample so flags, emotes, and emoji images stay accurate.
              CommandDetail[entry.demoCommand].response(null, false)
            ) : entry.demo?.chat ? (
              <p className='m-0! font-mono text-xs leading-5 text-gray-300'>{entry.demo.chat}</p>
            ) : null}
            {entry.demo?.exampleUrl && (
              <a
                href={entry.demo.exampleUrl}
                target='_blank'
                rel='noreferrer'
                className={`${entry.demoCommand || entry.demo.chat ? 'mt-3' : ''} inline-block text-sm font-medium text-purple-400 hover:text-purple-300`}
              >
                {entry.demo.exampleLabel ?? 'See a live example'}
              </a>
            )}
          </div>
        </div>
      )}

      {entry.details && entry.details.length > 0 && (
        <details className='group mt-5 border-t border-gray-700 pt-4'>
          <summary className='flex w-fit cursor-pointer list-none select-none items-center gap-2 rounded-sm text-sm font-medium text-gray-300 hover:text-purple-300 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-purple-400 [&::-webkit-details-marker]:hidden'>
            <span
              aria-hidden='true'
              className='inline-block text-gray-500 transition-transform duration-200 group-open:rotate-90'
            >
              ›
            </span>
            Release details
          </summary>
          <div className='mt-3 max-w-3xl space-y-3 text-sm leading-6 text-gray-300'>
            {entry.details.map((paragraph, index) => (
              <p key={`${entry.id}-${index}`} className='m-0!'>
                {paragraph}
              </p>
            ))}
          </div>
        </details>
      )}

      {hasFooter && (
        <div className='mt-5 flex flex-col gap-4 border-t border-gray-700 pt-4 sm:flex-row sm:flex-wrap sm:items-center'>
          {!readOnly && entry.settingKey && (
            <TierSwitch
              settingKey={entry.settingKey}
              checked={checked}
              onChange={(enabled) => updateSetting(enabled)}
              label={`Use ${entry.title}`}
              hideTierBadge
            />
          )}
          <div className='flex flex-wrap items-center gap-x-5 gap-y-2 sm:ml-auto'>
            {entry.deepLink && (
              <Link
                href={`${entry.deepLink.path}${entry.deepLink.section ? `#${entry.deepLink.section}` : ''}`}
                className='text-sm font-medium text-purple-400 hover:text-purple-300'
              >
                {deepLinkLabel(entry.deepLink)}
              </Link>
            )}
            {entry.blogSlug && (
              <Link
                href={`/blog/${entry.blogSlug}`}
                className='text-sm font-medium text-purple-400 hover:text-purple-300'
              >
                Read announcement
              </Link>
            )}
            {entry.docsUrl && (
              <a
                href={entry.docsUrl}
                target='_blank'
                rel='noreferrer'
                className='text-sm font-medium text-purple-400 hover:text-purple-300'
              >
                Read documentation
              </a>
            )}
          </div>
        </div>
      )}
    </article>
  )
}
