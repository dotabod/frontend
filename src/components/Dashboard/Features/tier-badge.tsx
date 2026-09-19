import type { SubscriptionTier } from '@prisma/client'
import { Button, Tag, Tooltip } from 'antd'
import { CrownIcon } from 'lucide-react'
import Link from 'next/link'

import { useSubscription } from '@/hooks/use-subscription'
import { getRequiredTier, isSubscriptionActive, SUBSCRIPTION_TIERS } from '@/utils/subscription'
import type { FeatureTier, GenericFeature } from '@/utils/subscription'

export const TierBadge: React.FC<{
  requiredTier?: SubscriptionTier | null
  feature?: FeatureTier | GenericFeature
  tooltip?: boolean
}> = ({ requiredTier, feature, tooltip = true }) => {
  const { subscription } = useSubscription()
  const featureRequiredTier = getRequiredTier(feature)
  const tierToShow = feature ? featureRequiredTier : requiredTier

  return (
    tierToShow &&
    tierToShow !== SUBSCRIPTION_TIERS.FREE && (
      <Tooltip
        title={
          !isSubscriptionActive({ status: subscription?.status }) &&
          tooltip && (
            <>
              <span>Upgrade to use this feature.</span>

              <Link href='/dashboard/billing'>
                <Button type='primary' className='mt-2'>
                  <CrownIcon
                    color={tierToShow === SUBSCRIPTION_TIERS.PRO ? 'gold' : undefined}
                    className='h-4 w-4'
                  />{' '}
                  Upgrade
                </Button>
              </Link>
            </>
          )
        }
      >
        <Tag color={tierToShow === SUBSCRIPTION_TIERS.PRO ? 'gold' : undefined}>
          <div className='flex items-center gap-2 p-1'>
            <CrownIcon className='h-4 w-4' />
            <span className='first-letter:uppercase'>{tierToShow?.toLowerCase()}</span>
          </div>
        </Tag>
      </Tooltip>
    )
  )
}
