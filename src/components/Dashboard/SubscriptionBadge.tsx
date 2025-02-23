import { useSubscription } from '@/hooks/useSubscription'
import { SUBSCRIPTION_TIERS } from '@/utils/subscription'
import { Tag, Tooltip } from 'antd'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { plans } from '../Billing/BillingPlans'
export const SubscriptionBadge = ({ collapsed }: { collapsed: boolean }) => {
  const { subscription } = useSubscription()
  const { data } = useSession()
  const currentPlan = plans.find((plan) => plan.tier === subscription?.tier)

  if (data?.user?.isImpersonating) {
    return null
  }

  const commonClasses = 'flex items-center gap-2'
  const tooltipProps = {
    title: 'Manage your subscription',
    placement: collapsed ? ('right' as const) : undefined,
  }

  const subscriptionContent = collapsed ? (
    <div
      className={`${commonClasses} justify-center mx-auto hover:cursor-pointer hover:opacity-90 transition-opacity duration-200 hover:scale-110`}
    >
      <Tooltip {...tooltipProps}>
        <Link href='/dashboard/billing'>
          <div className={commonClasses}>{currentPlan?.logo}</div>
        </Link>
      </Tooltip>
    </div>
  ) : (
    <div className={`${commonClasses} justify-center`}>
      <Tooltip {...tooltipProps}>
        <Link href='/dashboard/billing'>
          <Tag color={subscription?.tier === SUBSCRIPTION_TIERS.PRO ? 'gold' : 'default'}>
            <div className={commonClasses}>
              {currentPlan?.logo}
              {currentPlan?.name} Plan
            </div>
          </Tag>
        </Link>
      </Tooltip>
    </div>
  )

  return subscriptionContent
}
