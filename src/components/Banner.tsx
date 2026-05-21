import { XMarkIcon } from '@heroicons/react/20/solid'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import useSWR from 'swr'
import { fetcher } from '@/lib/fetcher'

const BANNER_FRESHNESS_DAYS = 14
const DISMISSED_KEY = 'dotabod-banner-dismissed-slug'

interface LatestPost {
  slug: string
  title: string
  description: string
  date: string
}

function isFresh(date: string): boolean {
  const daysSince = (Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24)
  return daysSince >= 0 && daysSince <= BANNER_FRESHNESS_DAYS
}

export default function Banner() {
  const { data } = useSWR<{ post: LatestPost | null }>('/api/latest-post', fetcher)
  const [dismissedSlug, setDismissedSlug] = useState<string | null>(null)

  useEffect(() => {
    setDismissedSlug(localStorage.getItem(DISMISSED_KEY))
  }, [])

  const post = data?.post
  if (!post || !isFresh(post.date) || dismissedSlug === post.slug) {
    return null
  }

  const dismiss = () => {
    localStorage.setItem(DISMISSED_KEY, post.slug)
    setDismissedSlug(post.slug)
  }

  return (
    <div className='relative isolate flex items-center gap-x-6 overflow-hidden bg-gray-800 px-6 sm:before:flex-1'>
      <div
        aria-hidden='true'
        className='absolute top-1/2 left-[max(-7rem,calc(50%-52rem))] -z-10 -translate-y-1/2 transform-gpu blur-2xl'
      >
        <div
          style={{
            clipPath:
              'polygon(74.8% 41.9%, 97.2% 73.2%, 100% 34.9%, 92.5% 0.4%, 87.5% 0%, 75% 28.6%, 58.5% 54.6%, 50.1% 56.8%, 46.9% 44%, 48.3% 17.4%, 24.7% 53.9%, 0% 27.9%, 11.9% 74.2%, 24.9% 54.1%, 68.6% 100%, 74.8% 41.9%)',
          }}
          className='aspect-577/310 w-[36.0625rem] bg-gradient-to-r from-blue-600 to-teal-500 opacity-40'
        />
      </div>
      <div
        aria-hidden='true'
        className='absolute top-1/2 left-[max(45rem,calc(50%+8rem))] -z-10 -translate-y-1/2 transform-gpu blur-2xl'
      >
        <div
          style={{
            clipPath:
              'polygon(74.8% 41.9%, 97.2% 73.2%, 100% 34.9%, 92.5% 0.4%, 87.5% 0%, 75% 28.6%, 58.5% 54.6%, 50.1% 56.8%, 46.9% 44%, 48.3% 17.4%, 24.7% 53.9%, 0% 27.9%, 11.9% 74.2%, 24.9% 54.1%, 68.6% 100%, 74.8% 41.9%)',
          }}
          className='aspect-577/310 w-[36.0625rem] bg-gradient-to-r from-blue-600 to-teal-500 opacity-40'
        />
      </div>
      <p className='text-sm/6 text-gray-100 my-0!'>
        Fresh on the blog: {post.title}.{' '}
        <Link
          href={`/blog/${post.slug}`}
          className='font-semibold whitespace-nowrap text-teal-300 hover:text-teal-200'
        >
          Read it&nbsp;<span aria-hidden='true'>&rarr;</span>
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
        >
          <span className='sr-only'>Dismiss</span>
          <XMarkIcon aria-hidden='true' className='size-5 text-gray-200' />
        </button>
      </div>
    </div>
  )
}
