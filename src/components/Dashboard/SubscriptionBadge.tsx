import { Badge, Skeleton, Tag, Tooltip } from 'antd'
import { CrownIcon, Wallet } from 'lucide-react'
import { useSession } from 'next-auth/react'
import Image from 'next/image'
import Link from 'next/link'
import { useMemo } from 'react'

import { useSubscriptionContext } from '@/contexts/SubscriptionContext'
import { getSubscriptionStatusInfo } from '@/utils/subscription'

import { plans } from '../Billing/BillingPlans'

export const SubscriptionBadge = ({ collapsed }: { collapsed: boolean }) => {
  const { data } = useSession()
  const { subscription, hasActivePlan, inGracePeriod, isLoading } = useSubscriptionContext()
  const currentPlan = plans.find((plan) => plan.tier === subscription?.tier)

  // Check if a credit balance exists
  const creditBalance = useMemo(() => {
    if (!subscription?.metadata || typeof subscription.metadata !== 'object') {
      return 0
    }
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
    placement: collapsed ? ('right' as const) : undefined,
    title: statusInfo?.message || 'Manage your subscription',
  }

  // Determine badge status
  const getBadgeStatus = () => {
    if (!statusInfo) {
      return 'default'
    }
    switch (statusInfo.type) {
      case 'success': {
        return 'success'
      }
      case 'warning': {
        return 'warning'
      }
      case 'error': {
        return 'error'
      }
      default: {
        return 'processing'
      }
    }
  }

  // Get the appropriate subscription badge based on subscription type
  const getSubscriptionBadge = () => {
    // Priority order: Lifetime > Gift > Pro > Grace Period
    if (subscription?.transactionType === 'LIFETIME') {
      return {
        color: 'black',
        icon: <CrownIcon size={14} className='inline-block flex-shrink-0' />,
        text: 'Lifetime Pro',
        tooltip: 'Lifetime Pro Subscriber',
      }
    }

    // If user has a regular subscription and credit balance
    if (hasActivePlan && creditBalance > 0) {
      return {
        color: 'gold',
        icon: (
          <div className='relative'>
            <CrownIcon size={14} className='inline-block flex-shrink-0' />
            <Wallet size={10} className='absolute -top-1 -right-2 text-amber-400' />
          </div>
        ),
        text: 'Pro + Credit',
        tooltip: 'Pro Subscriber with Credit Balance',
      }
    }

    if (hasActivePlan) {
      return {
        color: 'gold',
        icon: <CrownIcon size={14} className='inline-block flex-shrink-0' />,
        text: 'Pro',
        tooltip: 'Pro Subscriber',
      }
    }

    if (creditBalance > 0) {
      return {
        color: 'green',
        icon: <Wallet size={14} className='inline-block flex-shrink-0' />,
        text: 'Credit Balance',
        tooltip: 'Credit balance available - subscribe to use it',
      }
    }

    if (inGracePeriod) {
      return {
        color: 'blue',
        icon: <CrownIcon size={14} className='inline-block flex-shrink-0' />,
        text: 'Free Trial',
        tooltip: 'Using Pro features during free trial period',
      }
    }

    return null
  }

  // Get the badge details
  const badgeDetails = getSubscriptionBadge()

  // Logo for lifetime is https://cdn.betterttv.net/emote/609431bc39b5010444d0cbdc/3x.webp
  // Otherwise its the current plan logo
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
      className={`${commonClasses} mx-auto justify-center transition-opacity duration-200 hover:scale-110 hover:cursor-pointer hover:opacity-90`}
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
              className='w-full min-w-[130px] rounded-md px-3 py-1.5 transition-all duration-200'
            />
          ) : (
            <Tag
              color={badgeDetails?.color || statusInfo?.badge}
              className='w-full rounded-md px-3 py-1.5 transition-all duration-200 hover:shadow-md'
            >
              <div className={`${commonClasses} w-full justify-center`}>
                <div className='flex w-full items-center justify-center gap-4'>
                  {badgeDetails?.icon ? (
                    <div className='flex w-full items-center justify-between'>
                      {badgeDetails.icon}
                      <span className='font-medium'>{badgeDetails.text}</span>
                    </div>
                  ) : (
                    <div className='flex w-full items-center justify-between'>
                      {logo}
                      <span className='font-medium'>{currentPlan?.name} Plan</span>
                    </div>
                  )}
                </div>
              </div>
              {!badgeDetails && statusInfo?.message && (
                <div className='mt-1 w-full text-center text-xs break-words opacity-90'>
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
