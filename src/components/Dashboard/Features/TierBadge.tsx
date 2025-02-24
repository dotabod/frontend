import { useSubscription } from '@/hooks/useSubscription'
import {
  type FeatureTier,
  type GenericFeature,
  SUBSCRIPTION_TIERS,
  type SubscriptionTier,
  getRequiredTier,
  isSubscriptionActive,
} from '@/utils/subscription'
import { Button, Tag, Tooltip } from 'antd'
import { CrownIcon } from 'lucide-react'
import Link from 'next/link'

export const TierBadge: React.FC<{
  requiredTier?: SubscriptionTier | null
  feature?: FeatureTier | GenericFeature
  tooltip?: boolean
}> = ({ requiredTier, feature, tooltip = true }) => {
  const { subscription } = useSubscription()
  const featureRequiredTier = getRequiredTier(feature)
  const tierToShow = feature ? featureRequiredTier : requiredTier

  if (isSubscriptionActive({ status: subscription?.status })) {
    return null
  }

  return (
    tierToShow &&
    tierToShow !== SUBSCRIPTION_TIERS.FREE && (
      <Tooltip
        title={
          tooltip && (
            <>
              <span>
                To use this feature, upgrade your plan and access the most powerful features of
                Dotabod for your stream
              </span>

              <Link href='/dashboard/billing'>
                <Button type='primary' className='mt-2'>
                  <CrownIcon
                    color={tierToShow === SUBSCRIPTION_TIERS.PRO ? 'gold' : undefined}
                    className='h-4 w-4'
                  />{' '}
                  Upgrade your stream
                </Button>
              </Link>
            </>
          )
        }
      >
        <Tag color={tierToShow === SUBSCRIPTION_TIERS.PRO ? 'gold' : undefined}>
          <div className='flex items-center gap-2 p-1'>
            <CrownIcon className='h-4 w-4' />
            <span className='first-letter:uppercase'>{tierToShow}</span>
          </div>
        </Tag>
      </Tooltip>
    )
  )
}
