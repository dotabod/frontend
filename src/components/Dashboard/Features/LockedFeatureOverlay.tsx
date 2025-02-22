import { Button } from 'antd'
import Link from 'next/link'
import type { SubscriptionTier } from '@/utils/subscription'
import Image from 'next/image'
import { TierBadge } from './TierBadge'

interface LockedFeatureOverlayProps {
  requiredTier?: SubscriptionTier | null
  message?: React.ReactNode
}

export function LockedFeatureOverlay({
  requiredTier,
  message = (
    <span>
      Unlock this feature by upgrading to{' '}
      <TierBadge requiredTier={requiredTier} />
    </span>
  ),
}: LockedFeatureOverlayProps) {
  if (!requiredTier) {
    return null
  }

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/1 rounded-lg backdrop-blur-sm z-10">
      {requiredTier === 'pro' ? (
        <Image
          src="https://cdn.betterttv.net/emote/609431bc39b5010444d0cbdc/3x.webp"
          width={68}
          height={68}
          className="rounded"
          style={{ objectFit: 'contain' }}
          alt="Starter"
        />
      ) : (
        <Image
          src="https://cdn.betterttv.net/emote/61f2f17c06fd6a9f5be2630a/3x.webp"
          width={68}
          height={68}
          className="rounded"
          style={{ objectFit: 'contain' }}
          alt="Starter"
        />
      )}
      <p className="text-white text-center mb-4">{message}</p>
      <Link href="/dashboard/billing">
        <Button type="primary">Upgrade now</Button>
      </Link>
    </div>
  )
}
