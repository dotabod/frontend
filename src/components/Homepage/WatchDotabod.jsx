import useSWR from 'swr'
import React from 'react'
import { Button } from 'antd'
import { fetcher } from '@/lib/fetcher'
import { useTranslation } from 'next-i18next'

export const WatchDotabod = () => {
  const { data: isDotabodLive } = useSWR('/api/is-dotabod-live', fetcher)
  const { t } = useTranslation('common')

  if (!isDotabodLive) return null

  return (
    <Button
      type="primary"
      className="!bg-purple-700 hover:!bg-purple-600"
      href="https://twitch.tv/dotabod"
      target="_blank"
    >
      <div className="flex items-center space-x-2">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M21 2H3v16h5v4l4-4h5l4-4V2zm-10 9V7m5 4V7"></path>
        </svg>
        <span>{t('hero.watch')}</span>
        <span className="animate-pulse rounded-md bg-red-700 px-2 py-0.5 text-xs">
          {t('live')}
        </span>
      </div>
    </Button>
  )
}
