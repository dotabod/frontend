import type { SubscriptionTier } from '@/utils/subscription'
import { Button } from 'antd'
import Image from 'next/image'
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
  if (!requiredTier) {
    return null
  }

  return (
    <div className='absolute inset-0 flex flex-col items-center justify-center bg-black/60 rounded-lg backdrop-blur-md z-10'>
      <div className='flex flex-col items-center gap-6 p-8 max-w-lg'>
        {requiredTier === 'pro' ? (
          <Image
            src='https://cdn.betterttv.net/emote/609431bc39b5010444d0cbdc/3x.webp'
            width={84}
            height={84}
            className='rounded-lg shadow-lg hover:scale-110 transition-transform duration-200'
            style={{ objectFit: 'contain' }}
            alt='Pro tier emote'
          />
        ) : (
          <Image
            src='https://cdn.betterttv.net/emote/61f2f17c06fd6a9f5be2630a/3x.webp'
            width={84}
            height={84}
            className='rounded-lg shadow-lg hover:scale-110 transition-transform duration-200'
            style={{ objectFit: 'contain' }}
            alt='Starter tier emote'
          />
        )}
        <TierBadge requiredTier={requiredTier} />

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
