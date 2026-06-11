import { Sparkles } from 'lucide-react'
import Link from 'next/link'
import { whatsNew } from '@/lib/whatsNew'

// Compact, unmissable pointer to the What's New page (the bell gets ignored). Shows the
// titles of the newest entries and links to the full list.
export default function WhatsNewTeaser() {
  const latest = [...whatsNew]
    .sort((a, b) => new Date(b.releaseDate).getTime() - new Date(a.releaseDate).getTime())
    .slice(0, 2)
  if (!latest.length) return null

  return (
    <Link
      href='/dashboard/whats-new'
      className='mb-6 flex items-center justify-between gap-4 rounded-lg border border-purple-500/30 bg-purple-500/5 p-4 transition-colors hover:border-purple-500/60'
    >
      <div className='flex items-start gap-3'>
        <Sparkles className='mt-0.5 h-5 w-5 shrink-0 text-purple-400' />
        <div>
          <div className='font-semibold text-white'>What&apos;s new in Dotabod</div>
          <div className='text-sm text-gray-400'>{latest.map((e) => e.title).join(' · ')}</div>
        </div>
      </div>
      <span className='shrink-0 text-sm font-medium text-purple-400'>See all →</span>
    </Link>
  )
}
