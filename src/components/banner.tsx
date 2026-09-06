import { useEffect, useState } from 'react'
import useSWR from 'swr'

import AnnouncementBanner from '@/components/announcement-banner'
import { fetcher } from '@/lib/fetcher'
import { whatsNewSorted } from '@/lib/whats-new'

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

const isFresh = function isFresh(date: string): boolean {
  const daysSince = (Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24)
  return daysSince >= 0 && daysSince <= BANNER_FRESHNESS_DAYS
}

const Banner = ({ whatsNewPath = '/whats-new' }: BannerProps) => {
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

  return <AnnouncementBanner announcement={announcement} onDismiss={dismiss} />
}

export default Banner
