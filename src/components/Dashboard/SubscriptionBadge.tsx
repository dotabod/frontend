import { useSubscriptionContext } from '@/contexts/SubscriptionContext'
import { getSubscriptionStatusInfo } from '@/utils/subscription'
import { Badge, Skeleton, Tag, Tooltip } from 'antd'
import { CrownIcon, Wallet } from 'lucide-react'
import { useSession } from 'next-auth/react'
import Image from 'next/image'
import Link from 'next/link'
import { useMemo } from 'react'
import { plans } from '../Billing/BillingPlans'

export const SubscriptionBadge = ({ collapsed }: { collapsed: boolean }) => {
  const { data } = useSession()
  const { subscription, isLifetimePlan, hasActivePlan, inGracePeriod, isLoading } =
    useSubscriptionContext()
  const currentPlan = plans.find((plan) => plan.tier === subscription?.tier)

  // Check if a credit balance exists
  const creditBalance = useMemo(() => {
    if (!subscription?.metadata || typeof subscription.metadata !== 'object') return 0
    return Number((subscription.metadata as Record<string, unknown>).creditBalance || 0)
  }, [subscription?.metadata])

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

  // Get the appropriate subscription badge based on subscription type
  const getSubscriptionBadge = () => {
    // Priority order: Lifetime > Gift > Pro > Grace Period
    if (subscription?.transactionType === 'LIFETIME') {
      return {
        icon: <CrownIcon size={14} className='inline-block flex-shrink-0' />,
        text: 'Lifetime Pro',
        color: 'black',
        tooltip: 'Lifetime Pro Subscriber',
      }
    }

    // If user has a regular subscription and credit balance
    if (hasActivePlan && creditBalance > 0) {
      return {
        icon: (
          <div className='relative'>
            <CrownIcon size={14} className='inline-block flex-shrink-0' />
            <Wallet size={10} className='absolute -top-1 -right-2 text-amber-400' />
          </div>
        ),
        text: 'Pro + Credit',
        color: 'gold',
        tooltip: 'Pro Subscriber with Credit Balance',
      }
    }

    if (hasActivePlan) {
      return {
        icon: <CrownIcon size={14} className='inline-block flex-shrink-0' />,
        text: 'Pro',
        color: 'gold',
        tooltip: 'Pro Subscriber',
      }
    }

    if (creditBalance > 0) {
      return {
        icon: <Wallet size={14} className='inline-block flex-shrink-0' />,
        text: 'Credit Balance',
        color: 'green',
        tooltip: 'Credit balance available - subscribe to use it',
      }
    }

    if (inGracePeriod) {
      return {
        icon: <CrownIcon size={14} className='inline-block flex-shrink-0' />,
        text: 'Free Trial',
        color: 'blue',
        tooltip: 'Using Pro features during free trial period',
      }
    }

    return null
  }

  // Get the badge details
  const badgeDetails = getSubscriptionBadge()

  // logo for lifetime is https://cdn.betterttv.net/emote/609431bc39b5010444d0cbdc/3x.webp
  // otherwise its the current plan logo
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
      <Tooltip title={badgeDetails?.tooltip || tooltipProps.title}>
        <Link href='/dashboard/billing' className='no-underline'>
          {isLoading || !currentPlan ? (
            <Skeleton.Button
              active
              size='small'
              shape='default'
              block
              className='px-3 py-1.5 rounded-md transition-all duration-200 w-full min-w-[130px]'
            />
          ) : (
            <Tag
              color={badgeDetails?.color || statusInfo?.badge}
              className='px-3 py-1.5 rounded-md transition-all duration-200 hover:shadow-md w-full'
            >
              <div className={`${commonClasses} justify-center w-full`}>
                <div className='flex items-center justify-center gap-4 w-full'>
                  {badgeDetails?.icon ? (
                    <div className='flex items-center justify-between w-full'>
                      {badgeDetails.icon}
                      <span className='font-medium'>{badgeDetails.text}</span>
                    </div>
                  ) : (
                    <div className='flex items-center justify-between w-full'>
                      {logo}
                      <span className='font-medium'>{currentPlan?.name} Plan</span>
                    </div>
                  )}
                </div>
              </div>
              {!badgeDetails && statusInfo?.message && (
                <div className='text-center text-xs mt-1 opacity-90 break-words w-full'>
                  {statusInfo.message}
                </div>
              )}
            </Tag>
          )}
        </Link>
      </Tooltip>
    </div>
  )

  return subscriptionContent
}
