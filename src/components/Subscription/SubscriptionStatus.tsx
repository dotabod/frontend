import { useSubscriptionContext } from '@/contexts/SubscriptionContext'
import { fetchGiftSubscriptions } from '@/lib/gift-subscription'
import {
  getCurrentPeriod,
  getGiftSubscriptionInfo,
  getSubscriptionStatusInfo,
} from '@/utils/subscription'
import { useSession } from 'next-auth/react'
import { useEffect, useState } from 'react'
import { SubscriptionAlerts } from './SubscriptionAlerts'
import type { GiftInfo, SubscriptionWithGiftDetails } from './types'

interface SubscriptionStatusProps {
  showAlert?: boolean
}

export function SubscriptionStatusComponent({ showAlert = true }: SubscriptionStatusProps) {
  const {
    subscription: rawSubscription,
    inGracePeriod,
    hasActivePlan,
    isLifetimePlan,
    isPro,
  } = useSubscriptionContext()
  const subscription = rawSubscription as unknown as SubscriptionWithGiftDetails
  const { data: session } = useSession()
  const [giftInfo, setGiftInfo] = useState<GiftInfo>({
    hasGifts: false,
    giftCount: 0,
    giftMessage: '',
    proExpiration: null,
    hasLifetime: false,
  })

  const period = getCurrentPeriod(subscription?.stripePriceId)

  const statusInfo = getSubscriptionStatusInfo(
    subscription?.status,
    subscription?.cancelAtPeriodEnd,
    subscription?.currentPeriodEnd,
    subscription?.transactionType,
    subscription?.stripeSubscriptionId,
    subscription?.isGift,
    giftInfo.proExpiration,
  )

  // Get gift subscription info if applicable
  const giftSubInfo = getGiftSubscriptionInfo(
    {
      ...subscription,
      transactionType: subscription?.transactionType || undefined,
    },
    giftInfo.proExpiration,
    subscription?.giftDetails,
  )

  // Fetch gift information when the component mounts or when session changes
  useEffect(() => {
    if (!session?.user?.id) return

    // Skip fetching if the primary subscription is already a gift subscription
    // This maintains backward compatibility with existing tests
    if (subscription?.isGift) return

    const getGiftInfo = async () => {
      try {
        const giftData = await fetchGiftSubscriptions()
        setGiftInfo(giftData)
      } catch (error) {
        console.error('Error fetching gift subscriptions:', error)
      }
    }

    getGiftInfo()
  }, [session?.user?.id, subscription?.isGift])

  // Get appropriate subtitle based on subscription status
  const getSubtitle = () => {
    // If user has a gift subscription
    if (giftSubInfo?.isGift && subscription?.tier) {
      // Special case for lifetime gift
      if (isLifetimePlan || giftInfo.hasLifetime) {
        return `You have lifetime access to the ${
          subscription.tier.charAt(0).toUpperCase() + subscription.tier.slice(1).toLowerCase()
        } plan thanks to a generous gift`
      }

      return `You have a gift subscription to the ${
        subscription.tier.charAt(0).toUpperCase() + subscription.tier.slice(1).toLowerCase()
      } plan that will not auto-renew`
    }

    // If user has a lifetime subscription
    if (isLifetimePlan && subscription?.tier) {
      return `You have lifetime access to the ${
        subscription.tier.charAt(0).toUpperCase() + subscription.tier.slice(1).toLowerCase()
      } plan`
    }

    // If user has a paid subscription
    if (hasActivePlan && subscription?.tier) {
      // If they also have gift subscriptions
      if (giftInfo.hasGifts && giftInfo.proExpiration) {
        const giftExpirationDate = new Date(giftInfo.proExpiration)
        const subscriptionEndDate = subscription.currentPeriodEnd
          ? new Date(subscription.currentPeriodEnd)
          : null

        // If gift extends beyond subscription
        if (subscriptionEndDate && giftExpirationDate > subscriptionEndDate) {
          return `You are on the ${
            subscription.tier.charAt(0).toUpperCase() + subscription.tier.slice(1).toLowerCase()
          } plan (${period}) with additional gift coverage until ${giftExpirationDate.toLocaleDateString()}`
        }

        return `You are on the ${
          subscription.tier.charAt(0).toUpperCase() + subscription.tier.slice(1).toLowerCase()
        } plan (${period}) with additional gift subscription(s)`
      }

      return `You are currently on the ${
        subscription.tier.charAt(0).toUpperCase() + subscription.tier.slice(1).toLowerCase()
      } plan (${period})`
    }

    // If user has gift subscriptions but no active subscription
    if (giftInfo.hasGifts) {
      return `You have ${giftInfo.giftCount} gift subscription(s) to the Pro plan`
    }

    // If in grace period without paid subscription
    if (inGracePeriod && !hasActivePlan) {
      return 'Subscribe to Pro to continue using Dotabod Pro features after the free period ends.'
    }

    // If user has a subscription but it's not active
    if (subscription?.tier) {
      return 'You are currently on the Free plan'
    }

    // Default message for subscription management
    return 'Manage your subscription and billing settings'
  }

  // Dummy function for SubscriptionAlerts
  const handlePortalAccess = async () => {}

  return (
    <div className='flex flex-col gap-4'>
      {showAlert ? (
        <SubscriptionAlerts
          giftInfo={giftInfo}
          statusInfo={statusInfo}
          handlePortalAccess={handlePortalAccess}
          isLoading={false}
          giftSubInfo={giftSubInfo}
          hideManageButton={true}
        />
      ) : (
        <div className='text-base font-medium text-gray-300'>{getSubtitle()}</div>
      )}
    </div>
  )
}

// Export with the original name for backward compatibility
export const SubscriptionStatus = SubscriptionStatusComponent
