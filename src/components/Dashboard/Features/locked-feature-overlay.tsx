import type { SubscriptionTier } from '@prisma/client'
import { Button } from 'antd'
import Link from 'next/link'

import { SUBSCRIPTION_TIERS } from '@/utils/subscription'

import { TierBadge } from './tier-badge'

interface LockedFeatureOverlayProps {
  requiredTier?: SubscriptionTier | null
  message?: React.ReactNode
}

export const LockedFeatureOverlay = function LockedFeatureOverlay({
  requiredTier,
  message = (
    <span>
      To use this feature, upgrade your plan and access the most powerful features of Dotabod for
      your stream
    </span>
  ),
}: LockedFeatureOverlayProps) {
  if (!requiredTier || requiredTier === SUBSCRIPTION_TIERS.FREE) {
    return null
  }

  return (
    <div className='absolute inset-0 z-10 flex flex-col items-center justify-center rounded-lg bg-black/60 backdrop-blur-md'>
      <div className='flex max-w-lg flex-col items-center gap-6 p-8'>
        <TierBadge tooltip={false} requiredTier={requiredTier} />

        <div className='text-center'>
          <p className='mb-2 text-lg font-medium text-white'>{message}</p>
          <Link href='/dashboard/billing'>
            <Button
              type='primary'
              size='large'
              className='shadow-lg transition-transform duration-200 hover:scale-105'
            >
              Upgrade now
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
