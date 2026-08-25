import { XMarkIcon } from '@heroicons/react/20/solid'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import useSWR from 'swr'
import { fetcher } from '@/lib/fetcher'
import { whatsNewSorted } from '@/lib/whatsNew'

const BANNER_FRESHNESS_DAYS = 14
const DISMISSED_KEY = 'dotabod-banner-dismissed-slug'

interface LatestPost {
  slug: string
  title: string
  description: string
  date: string
}

interface BannerProps {
  whatsNewPath?: '/whats-new' | '/dashboard/whats-new'
}

function isFresh(date: string): boolean {
  const daysSince = (Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24)
  return daysSince >= 0 && daysSince <= BANNER_FRESHNESS_DAYS
}

export default function Banner({ whatsNewPath = '/whats-new' }: BannerProps) {
  const { data, isLoading } = useSWR<{ post: LatestPost | null }>('/api/latest-post', fetcher)
  const [dismissedSlug, setDismissedSlug] = useState<string | null>(null)

  useEffect(() => {
    setDismissedSlug(localStorage.getItem(DISMISSED_KEY))
  }, [])

  const post = data?.post
  const latestRelease = whatsNewSorted[0]
  const freshPost = post && isFresh(post.date) ? post : null
  const freshRelease = latestRelease && isFresh(latestRelease.releaseDate) ? latestRelease : null
  const showBlog =
    freshPost &&
    (!freshRelease ||
      new Date(freshPost.date).getTime() >= new Date(freshRelease.releaseDate).getTime())
  const announcement = showBlog
    ? {
        href: `/blog/${freshPost.slug}`,
        id: freshPost.slug,
        label: 'Read it',
        prefix: 'Fresh on the blog',
        title: freshPost.title,
      }
    : freshRelease
      ? {
          href: `${whatsNewPath}#${freshRelease.id}`,
          id: `whats-new:${freshRelease.id}`,
          label: "See what's new",
          prefix: 'New in Dotabod',
          title: freshRelease.title,
        }
      : null

  if (isLoading || !announcement || dismissedSlug === announcement.id) {
    return null
  }

  const dismiss = () => {
    localStorage.setItem(DISMISSED_KEY, announcement.id)
    setDismissedSlug(announcement.id)
  }

  return (
    <aside
      aria-label='Latest Dotabod update'
      className='relative isolate flex min-h-11 items-center gap-x-4 border-y border-purple-900/70 bg-gray-900 px-4 py-2.5 sm:px-6 sm:before:flex-1'
    >
      <span aria-hidden='true' className='size-1.5 flex-none rounded-full bg-purple-400' />
      <p className='my-0! text-sm/6 text-gray-200'>
        {announcement.prefix}:{' '}
        <span className='font-medium text-gray-100'>{announcement.title}</span>.{' '}
        <Link
          href={announcement.href}
          className='whitespace-nowrap font-semibold text-purple-300 hover:text-purple-200'
        >
          {announcement.label}&nbsp;<span aria-hidden='true'>&rarr;</span>
        </Link>
      </p>
      <div className='flex flex-1 justify-end'>
        <button
          type='button'
          className='-m-3 p-3 focus-visible:outline-offset-[-4px]'
          onClick={(e) => {
            e.preventDefault()
            dismiss()
          }}
          aria-label={`Dismiss ${announcement.prefix.toLowerCase()} announcement`}
        >
          <XMarkIcon aria-hidden='true' className='size-5 text-gray-200' />
        </button>
      </div>
    </aside>
  )
}
