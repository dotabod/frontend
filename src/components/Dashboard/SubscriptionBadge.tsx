import { useSubscription } from '@/hooks/useSubscription'
import { getSubscriptionStatusInfo } from '@/utils/subscription'
import { Tag, Tooltip } from 'antd'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { plans } from '../Billing/BillingPlans'

export const SubscriptionBadge = ({ collapsed }: { collapsed: boolean }) => {
  const { subscription } = useSubscription()
  const { data } = useSession()
  const currentPlan = plans.find((plan) => plan.tier === subscription?.tier)
  const statusInfo = getSubscriptionStatusInfo(
    subscription?.status,
    subscription?.cancelAtPeriodEnd,
    subscription?.currentPeriodEnd,
  )

  if (data?.user?.isImpersonating) {
    return null
  }

  const commonClasses = 'flex items-center gap-2'
  const tooltipProps = {
    title: statusInfo?.message || 'Manage your subscription',
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
          <Tag color={statusInfo?.badge}>
            <div className={`${commonClasses} justify-center`}>
              <div className='flex items-center gap-2'>
                {currentPlan?.logo}
                {currentPlan?.name} Plan
              </div>
            </div>
            {statusInfo?.message && <div className='text-center'>{statusInfo.message}</div>}
          </Tag>
        </Link>
      </Tooltip>
    </div>
  )

  return subscriptionContent
}
