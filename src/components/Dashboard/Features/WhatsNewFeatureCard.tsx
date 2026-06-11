import Link from 'next/link'
import { useUpdateSetting } from '@/lib/hooks/useUpdateSetting'
import { deepLinkLabel, entryToggleChecked, type WhatsNewEntry } from '@/lib/whatsNew'
import { Card } from '@/ui/card'
import { formatDate } from '@/utils/formatDate'
import { TierSwitch } from './TierSwitch'

// One feature on the What's New page: title, release date, description, an inline toggle (when
// the feature has a setting), and deep-link / read-more links.
export default function WhatsNewFeatureCard({
  entry,
  master,
  latest,
  readOnly,
}: {
  entry: WhatsNewEntry
  master?: boolean
  latest?: boolean
  readOnly?: boolean
}) {
  // Always call the hook (rules of hooks); it no-ops when there's no settingKey.
  const { data: value, updateSetting } = useUpdateSetting<boolean | null>(entry.settingKey)
  const checked = entryToggleChecked(entry, value, master)

  // The public changelog (/whats-new) renders the same cards read-only — no toggle.
  const hasFooter =
    (!readOnly && Boolean(entry.settingKey)) ||
    Boolean(entry.deepLink) ||
    Boolean(entry.blogSlug) ||
    Boolean(entry.docsUrl)

  return (
    <Card title={entry.title}>
      <div className='space-y-3'>
        <div className='flex flex-wrap items-center gap-2 text-xs text-gray-400'>
          <span>{formatDate(entry.releaseDate)}</span>
          {latest && (
            <span className='rounded bg-purple-600 px-1.5 py-0.5 font-medium text-white'>
              Latest
            </span>
          )}
          {entry.command && (
            <span className='rounded bg-gray-700 px-1.5 py-0.5 font-mono text-gray-200'>
              {entry.command}
            </span>
          )}
        </div>

        <p className='text-sm text-gray-300'>{entry.description}</p>

        {entry.demo && (
          <div className='rounded-md border border-gray-700/60 bg-gray-800/50 p-3'>
            <div className='mb-1.5 text-xs font-medium text-gray-500'>Example</div>
            {entry.demo.chat && (
              <p className='font-mono text-xs text-gray-300'>{entry.demo.chat}</p>
            )}
            {entry.demo.exampleUrl && (
              <a
                href={entry.demo.exampleUrl}
                target='_blank'
                rel='noreferrer'
                className='mt-2 inline-block text-xs font-medium text-purple-400 hover:text-purple-300'
              >
                {entry.demo.exampleLabel ?? 'See a live example →'}
              </a>
            )}
          </div>
        )}

        {entry.details && entry.details.length > 0 && (
          <details className='group rounded-md border border-gray-700/60 bg-gray-800/30 px-3 py-2'>
            <summary className='flex cursor-pointer list-none select-none items-center gap-1 text-xs font-medium text-purple-400 hover:text-purple-300 [&::-webkit-details-marker]:hidden'>
              <span className='inline-block transition-transform group-open:rotate-90'>›</span>
              How it works
            </summary>
            <div className='mt-2 space-y-2 text-sm text-gray-300'>
              {entry.details.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
          </details>
        )}

        {hasFooter && (
          <div className='flex flex-wrap items-center gap-4 border-t border-gray-700 pt-3'>
            {!readOnly && entry.settingKey && (
              <TierSwitch
                settingKey={entry.settingKey}
                checked={checked}
                onChange={(c) => updateSetting(c)}
                label='Enabled'
              />
            )}
            {entry.deepLink && (
              <Link
                href={`${entry.deepLink.path}${entry.deepLink.section ? `#${entry.deepLink.section}` : ''}`}
                className='text-sm font-medium text-purple-400 hover:text-purple-300'
              >
                {deepLinkLabel(entry.deepLink)} →
              </Link>
            )}
            {entry.blogSlug && (
              <Link
                href={`/blog/${entry.blogSlug}`}
                className='text-sm font-medium text-purple-400 hover:text-purple-300'
              >
                Read more →
              </Link>
            )}
            {entry.docsUrl && (
              <a
                href={entry.docsUrl}
                target='_blank'
                rel='noreferrer'
                className='text-sm font-medium text-purple-400 hover:text-purple-300'
              >
                Read more →
              </a>
            )}
          </div>
        )}
      </div>
    </Card>
  )
}
