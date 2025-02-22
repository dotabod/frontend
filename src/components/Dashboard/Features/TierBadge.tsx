import {
  type FeatureTier,
  type GenericFeature,
  type SubscriptionTier,
  getRequiredTier,
} from '@/utils/subscription'
import { Button, Tag, Tooltip } from 'antd'
import { CrownIcon } from 'lucide-react'
import Link from 'next/link'

export const TierBadge: React.FC<{
  requiredTier?: SubscriptionTier | null
  feature?: FeatureTier | GenericFeature
}> = ({ requiredTier, feature }) => {
  const featureRequiredTier = getRequiredTier(feature)
  const tierToShow = feature ? featureRequiredTier : requiredTier

  return (
    tierToShow &&
    tierToShow !== 'free' && (
      <Tooltip
        title={
          <>
            <span>
              To use this feature, upgrade your plan and access the most powerful features of
              Dotabod for your stream
            </span>

            <Link href='/dashboard/billing'>
              <Button type='primary' className='mt-2'>
                <CrownIcon color={tierToShow === 'starter' ? 'cyan' : 'gold'} className='h-4 w-4' />{' '}
                Upgrade your stream
              </Button>
            </Link>
          </>
        }
      >
        <Tag color={tierToShow === 'starter' ? 'cyan' : 'gold'}>
          <div className='flex items-center gap-2 p-1'>
            <CrownIcon className='h-4 w-4' />
            <span className='first-letter:uppercase'>{tierToShow}</span>
          </div>
        </Tag>
      </Tooltip>
    )
  )
}
