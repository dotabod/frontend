import { useSubscriptionContext } from '@/contexts/SubscriptionContext'
import {
  getCurrentPeriod,
  getSubscriptionStatusInfo,
  gracePeriodPrettyDate,
} from '@/utils/subscription'
import { Alert } from 'antd'

interface SubscriptionStatusProps {
  showAlert?: boolean
}

export function SubscriptionStatus({ showAlert = true }: SubscriptionStatusProps) {
  const { subscription, inGracePeriod, hasActivePlan, isLifetimePlan } = useSubscriptionContext()

  const period = getCurrentPeriod(subscription?.stripePriceId)

  const statusInfo = getSubscriptionStatusInfo(
    subscription?.status,
    subscription?.cancelAtPeriodEnd,
    subscription?.currentPeriodEnd,
    subscription?.transactionType,
    subscription?.stripeSubscriptionId,
  )

  // Get appropriate subtitle based on subscription status
  const getSubtitle = () => {
    // If user has a lifetime subscription
    if (isLifetimePlan && subscription) {
      return `You have lifetime access to the ${
        subscription.tier.charAt(0).toUpperCase() + subscription.tier.slice(1).toLowerCase()
      } plan`
    }

    // If user has a paid subscription
    if (hasActivePlan && subscription?.tier) {
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
      {showAlert && statusInfo?.message && (
        <Alert
          className='mt-6 max-w-2xl'
          message={statusInfo.message}
          type={statusInfo.type}
          showIcon
        />
      )}

      {/* Show additional alert for users with paid subscription during grace period */}
      {showAlert && inGracePeriod && hasActivePlan && (
        <Alert
          className='mt-2 max-w-2xl'
          message={
            isLifetimePlan
              ? 'Thank you for being a lifetime supporter!'
              : `All users have free Pro access until ${gracePeriodPrettyDate}, but you're already subscribed. Thank you for your support!`
          }
          type='success'
          showIcon
        />
      )}

      <div className='text-base'>
        {subscription ? getSubtitle() : 'Manage your subscription and billing settings'}
      </div>
    </div>
  )
}
