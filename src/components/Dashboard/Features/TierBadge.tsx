import {
  type SubscriptionTier,
  type FeatureTier,
  type GenericFeature,
  getRequiredTier,
} from '@/utils/subscription'
import { Tag } from 'antd'
import { CrownIcon } from 'lucide-react'

export const TierBadge: React.FC<{
  requiredTier?: SubscriptionTier | null
  feature?: FeatureTier | GenericFeature
}> = ({ requiredTier, feature }) => {
  const featureRequiredTier = getRequiredTier(feature)
  const tierToShow = feature ? featureRequiredTier : requiredTier

  return (
    tierToShow &&
    tierToShow !== 'free' && (
      <Tag color={tierToShow === 'starter' ? 'cyan' : 'gold'}>
        <div className='flex items-center gap-2 p-1'>
          <CrownIcon className='h-4 w-4' />
          <span className='first-letter:uppercase'>{tierToShow}</span>
        </div>
      </Tag>
    )
  )
}
