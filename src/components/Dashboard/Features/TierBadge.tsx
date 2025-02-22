import type { SubscriptionTier } from '@/utils/subscription'
import { Tag } from 'antd'
import Image from 'next/image'
export const TierBadge: React.FC<{
  requiredTier?: SubscriptionTier | null
}> = ({ requiredTier }) =>
  requiredTier &&
  requiredTier !== 'free' && (
    <Tag color={requiredTier === 'starter' ? 'cyan' : undefined}>
      <div className="flex items-center gap-2 p-1">
        {requiredTier === 'pro' ? (
          <Image
            src="https://cdn.betterttv.net/emote/609431bc39b5010444d0cbdc/3x.webp"
            width={24}
            height={24}
            className="rounded"
            style={{ objectFit: 'contain' }}
            alt="Starter"
          />
        ) : (
          <Image
            src="https://cdn.betterttv.net/emote/61f2f17c06fd6a9f5be2630a/3x.webp"
            width={24}
            height={24}
            className="rounded"
            style={{ objectFit: 'contain' }}
            alt="Starter"
          />
        )}
        <span className="first-letter:uppercase">{requiredTier}</span>
      </div>
    </Tag>
  )
