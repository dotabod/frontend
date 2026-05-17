import { Button } from 'antd'
import { CrownIcon, SparklesIcon } from 'lucide-react'
import Link from 'next/link'
import { useFeatureAccess, useSubscription } from '@/hooks/useSubscription'
import { useTrack } from '@/lib/track'

const ObsProUpsell = () => {
  const { hasAccess } = useFeatureAccess('autoOBS')
  const { isLoading } = useSubscription()
  const track = useTrack()

  // Don't flash the upsell at Pro users while their subscription is still resolving.
  if (isLoading || hasAccess) return null

  return (
    <div className='rounded-md border border-yellow-700/40 bg-yellow-950/15 px-4 py-3 mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between'>
      <div className='flex gap-3 items-start md:items-center'>
        <CrownIcon className='h-5 w-5 text-yellow-400 shrink-0 mt-0.5 md:mt-0' />
        <div>
          <p className='font-medium text-yellow-50'>Skip this with Pro</p>
          <p className='text-sm text-yellow-100/70'>
            Dotabod detects your open OBS and adds the browser source in about ten seconds. The
            manual steps below work the same; Pro just saves you the clicks.
          </p>
        </div>
      </div>
      <Link
        href='/dashboard/billing'
        onClick={() => track('overlay/upsell_click', { source: 'obs_manual' })}
      >
        <Button
          type='primary'
          size='middle'
          icon={<SparklesIcon className='h-4 w-4' />}
          className='shrink-0'
        >
          Upgrade
        </Button>
      </Link>
    </div>
  )
}

export default ObsProUpsell
