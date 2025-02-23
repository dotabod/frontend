import type { SubscriptionTier } from '@/utils/subscription'
import { Button } from 'antd'
import Link from 'next/link'
import { TierBadge } from './TierBadge'

interface LockedFeatureOverlayProps {
  requiredTier?: SubscriptionTier | null
  message?: React.ReactNode
}

export function LockedFeatureOverlay({
  requiredTier,
  message = (
    <span>
      To use this feature, upgrade your plan and access the most powerful features of Dotabod for
      your stream
    </span>
  ),
}: LockedFeatureOverlayProps) {
  if (!requiredTier || requiredTier === 'free') {
    return null
  }

  return (
    <div className='absolute inset-0 flex flex-col items-center justify-center bg-black/60 rounded-lg backdrop-blur-md z-10'>
      <div className='flex flex-col items-center gap-6 p-8 max-w-lg'>
        <TierBadge tooltip={false} requiredTier={requiredTier} />

        <div className='text-center'>
          <p className='text-white text-lg font-medium mb-2'>{message}</p>
          <Link href='/dashboard/billing'>
            <Button
              type='primary'
              size='large'
              className='shadow-lg hover:scale-105 transition-transform duration-200'
            >
              Upgrade now
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
