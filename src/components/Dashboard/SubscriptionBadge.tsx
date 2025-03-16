import { useSubscriptionContext } from '@/contexts/SubscriptionContext'
import { getSubscriptionStatusInfo } from '@/utils/subscription'
import { Badge, Tag, Tooltip } from 'antd'
import { useSession } from 'next-auth/react'
import Image from 'next/image'
import Link from 'next/link'
import { plans } from '../Billing/BillingPlans'
import { CrownIcon, GiftIcon } from 'lucide-react'
import { useEffect, useState } from 'react'
import { fetchGiftSubscriptions } from '@/lib/gift-subscription'

export const SubscriptionBadge = ({ collapsed }: { collapsed: boolean }) => {
  const { subscription, inGracePeriod, hasActivePlan } = useSubscriptionContext()
  const { data } = useSession()
  const currentPlan = plans.find((plan) => plan.tier === subscription?.tier)
  const [hasGiftSubscription, setHasGiftSubscription] = useState(false)

  // Fetch gift subscriptions to check if user has both types
  useEffect(() => {
    const checkGiftSubscriptions = async () => {
      if (!data?.user?.id || subscription?.isGift) return

      try {
        const giftData = await fetchGiftSubscriptions()
        setHasGiftSubscription(giftData.hasGifts)
      } catch (error) {
        console.error('Error fetching gift subscriptions:', error)
      }
    }

    checkGiftSubscriptions()
  }, [data?.user?.id, subscription?.isGift])

  const statusInfo = getSubscriptionStatusInfo(
    subscription?.status,
    subscription?.cancelAtPeriodEnd,
    subscription?.currentPeriodEnd,
    subscription?.transactionType,
    subscription?.stripeSubscriptionId,
    subscription?.isGift,
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

    // If user has both a regular subscription and gift subscription
    if (hasActivePlan && hasGiftSubscription && !subscription?.isGift) {
      return {
        icon: (
          <div className='relative'>
            <CrownIcon size={14} className='inline-block flex-shrink-0' />
            <GiftIcon size={10} className='absolute -top-1 -right-2 text-amber-400' />
          </div>
        ),
        text: 'Pro + Gift',
        color: 'gold',
        tooltip: 'Pro Subscriber with additional Gift Subscription',
      }
    }

    if (subscription?.isGift) {
      return {
        icon: <GiftIcon size={14} className='inline-block flex-shrink-0' />,
        text: 'Gifted Pro',
        color: 'gold',
        tooltip: 'Received Pro as a gift',
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
      <Tooltip title={badgeDetails?.tooltip || tooltipProps.title}>
        <Link href='/dashboard/billing' className='no-underline'>
          <Tag
            color={badgeDetails?.color || statusInfo?.badge}
            className='px-3 py-1.5 rounded-md transition-all duration-200 hover:shadow-md'
          >
            <div className={`${commonClasses} justify-center`}>
              <div className='flex items-center gap-2'>
                {badgeDetails?.icon ? (
                  <>
                    {badgeDetails.icon}
                    <span className='font-medium'>{badgeDetails.text}</span>
                  </>
                ) : (
                  <>
                    {logo}
                    <span className='font-medium'>{currentPlan?.name} Plan</span>
                  </>
                )}
              </div>
            </div>
            {!badgeDetails && statusInfo?.message && (
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
