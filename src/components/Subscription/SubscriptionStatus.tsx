import { useSubscriptionContext } from '@/contexts/SubscriptionContext'
import { fetchGiftSubscriptions } from '@/lib/gift-subscription'
import {
  getCurrentPeriod,
  getGiftSubscriptionInfo,
  getSubscriptionStatusInfo,
  gracePeriodPrettyDate,
} from '@/utils/subscription'
import { Alert } from 'antd'
import { useSession } from 'next-auth/react'
import { useEffect, useState } from 'react'
import { GiftIcon } from 'lucide-react'

interface SubscriptionStatusProps {
  showAlert?: boolean
}

export function SubscriptionStatus({ showAlert = true }: SubscriptionStatusProps) {
  const { subscription, inGracePeriod, hasActivePlan, isLifetimePlan } = useSubscriptionContext()
  const { data: session } = useSession()
  const [giftInfo, setGiftInfo] = useState<{
    hasGifts: boolean
    giftCount: number
    giftMessage: string
  }>({
    hasGifts: false,
    giftCount: 0,
    giftMessage: '',
  })

  const period = getCurrentPeriod(subscription?.stripePriceId)

  const statusInfo = getSubscriptionStatusInfo(
    subscription?.status,
    subscription?.cancelAtPeriodEnd,
    subscription?.currentPeriodEnd,
    subscription?.transactionType,
    subscription?.stripeSubscriptionId,
    subscription?.isGift,
  )

  // Get gift subscription info if applicable
  const giftSubInfo = getGiftSubscriptionInfo(subscription)

  // Fetch gift information when the component mounts
  useEffect(() => {
    const fetchGiftInfo = async () => {
      if (session?.user?.id && !subscription?.isGift) {
        try {
          const gifts = await fetchGiftSubscriptions()
          setGiftInfo(gifts)
        } catch (error) {
          console.error('Error fetching gift information:', error)
        }
      }
    }

    fetchGiftInfo()
  }, [session?.user?.id, subscription?.isGift])

  // Get appropriate subtitle based on subscription status
  const getSubtitle = () => {
    // If user has a gift subscription
    if (giftSubInfo.isGift && subscription?.tier) {
      // Special case for lifetime gift
      if (isLifetimePlan) {
        return `You have lifetime access to the ${
          subscription.tier.charAt(0).toUpperCase() + subscription.tier.slice(1).toLowerCase()
        } plan thanks to a generous gift`
      }

      return `You have a gift subscription to the ${
        subscription.tier.charAt(0).toUpperCase() + subscription.tier.slice(1).toLowerCase()
      } plan that will not auto-renew`
    }

    // If user has a lifetime subscription
    if (isLifetimePlan && subscription) {
      return `You have lifetime access to the ${
        subscription.tier.charAt(0).toUpperCase() + subscription.tier.slice(1).toLowerCase()
      } plan`
    }

    // If user has a paid subscription
    if (hasActivePlan && subscription?.tier) {
      // If they also have gift subscriptions
      if (giftInfo.hasGifts) {
        return `You are on the ${
          subscription.tier.charAt(0).toUpperCase() + subscription.tier.slice(1).toLowerCase()
        } plan (${period}) with additional gift subscription(s)`
      }

      return `You are currently on the ${
        subscription.tier.charAt(0).toUpperCase() + subscription.tier.slice(1).toLowerCase()
      } plan (${period})`
    }

    // If in grace period without paid subscription
    if (inGracePeriod && !hasActivePlan) {
      return 'Subscribe to Pro to continue using Dotabod Pro features after the free period ends.'
    }

    // Default message
    return 'Manage your subscription and billing settings'
  }

  return (
    <div className='flex flex-col gap-4'>
      {/* Primary subscription status alert - prioritize showing the most important information */}
      {showAlert && (
        <>
          {/* For lifetime gift subscriptions, show a single consolidated message */}
          {isLifetimePlan && giftSubInfo.isGift ? (
            <Alert
              className='mt-6 max-w-2xl'
              message='Lifetime Access'
              description='Someone gifted you lifetime access to Dotabod Pro. Enjoy all premium features forever!'
              type='success'
              showIcon
            />
          ) : isLifetimePlan ? (
            /* For regular lifetime subscriptions */
            <Alert
              className='mt-6 max-w-2xl'
              message='Lifetime Access'
              description='Thank you for being a lifetime supporter!'
              type='success'
              showIcon
            />
          ) : statusInfo?.message ? (
            /* For regular subscriptions, show the status info */
            <Alert
              className='mt-6 max-w-2xl'
              message={statusInfo.message}
              type={statusInfo.type}
              showIcon
            />
          ) : null}

          {/* Only show grace period alert if not a lifetime plan and in grace period */}
          {!isLifetimePlan && inGracePeriod && hasActivePlan && (
            <Alert
              className='mt-2 max-w-2xl'
              message={`All users have free Pro access until ${gracePeriodPrettyDate}, but you're already subscribed. Thank you for your support!`}
              type='info'
              showIcon
            />
          )}

          {/* Only show additional gift info if user has their own subscription plus gifts */}
          {giftInfo.hasGifts && !subscription?.isGift && !isLifetimePlan && (
            <Alert
              className='mt-2 max-w-2xl'
              message={giftInfo.giftMessage}
              type='info'
              showIcon
              icon={<GiftIcon size={16} />}
            />
          )}
        </>
      )}

      {/* Only show the subtitle text when alerts are hidden */}
      {!showAlert && subscription && <div className='text-base'>{getSubtitle()}</div>}
    </div>
  )
}
