import { useSubscriptionContext } from '@/contexts/SubscriptionContext'
import { getSubscriptionStatusInfo } from '@/utils/subscription'
import { Badge, Tag, Tooltip } from 'antd'
import { useSession } from 'next-auth/react'
import Image from 'next/image'
import Link from 'next/link'
import { plans } from '../Billing/BillingPlans'
export const SubscriptionBadge = ({ collapsed }: { collapsed: boolean }) => {
  const { subscription, inGracePeriod, hasActivePlan } = useSubscriptionContext()
  const { data } = useSession()
  const currentPlan = plans.find((plan) => plan.tier === subscription?.tier)
  const statusInfo = getSubscriptionStatusInfo(
    subscription?.status,
    subscription?.cancelAtPeriodEnd,
    subscription?.currentPeriodEnd,
    subscription?.transactionType,
    subscription?.stripeSubscriptionId,
  )

  if (data?.user?.isImpersonating) {
    return null
  }

  const commonClasses = 'flex items-center gap-2'
  const tooltipProps = {
    title: statusInfo?.message || 'Manage your subscription',
    placement: collapsed ? ('right' as const) : undefined,
  }

  // Determine badge status
  const getBadgeStatus = () => {
    if (!statusInfo) return 'default'
    switch (statusInfo.type) {
      case 'success':
        return 'success'
      case 'warning':
        return 'warning'
      case 'error':
        return 'error'
      default:
        return 'processing'
    }
  }

  // logo for lifetime is https://cdn.betterttv.net/emote/609431bc39b5010444d0cbdc/3x.webp
  // otehrwise its the current plan logo
  const logo =
    currentPlan?.tier === 'PRO' && subscription?.transactionType === 'LIFETIME' ? (
      <Image
        src='https://cdn.betterttv.net/emote/609431bc39b5010444d0cbdc/3x.webp'
        alt='Lifetime'
        width={24}
        height={24}
      />
    ) : (
      currentPlan?.logo
    )

  const subscriptionContent = collapsed ? (
    <div
      className={`${commonClasses} justify-center mx-auto hover:cursor-pointer hover:opacity-90 transition-opacity duration-200 hover:scale-110`}
    >
      <Tooltip {...tooltipProps}>
        <Link href='/dashboard/billing'>
          <Badge status={getBadgeStatus()} dot>
            <div className={commonClasses}>{logo}</div>
          </Badge>
        </Link>
      </Tooltip>
    </div>
  ) : (
    <div className={`${commonClasses} justify-center`}>
      <Tooltip {...tooltipProps}>
        <Link href='/dashboard/billing' className='no-underline'>
          <Tag
            color={statusInfo?.badge}
            className='px-3 py-1.5 rounded-md transition-all duration-200 hover:shadow-md'
          >
            <div className={`${commonClasses} justify-center`}>
              <div className='flex items-center gap-2'>
                {logo}
                <span className='font-medium'>{currentPlan?.name} Plan</span>
              </div>
            </div>
            {statusInfo?.message && (
              <div className='text-center text-xs mt-1 opacity-90 break-words'>
                {statusInfo.message}
              </div>
            )}
          </Tag>
        </Link>
      </Tooltip>
    </div>
  )

  return subscriptionContent
}
