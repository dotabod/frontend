import { Alert, Button, message, Skeleton } from 'antd'
import { ClockIcon, GiftIcon } from 'lucide-react'
import { useState } from 'react'
import { useSubscriptionContext } from '@/contexts/SubscriptionContext'
import { GRACE_PERIOD_END, isInGracePeriod } from '@/utils/subscription'
import type { GiftInfo, GiftSubInfo, StatusInfo, SubscriptionWithGiftDetails } from './types'

// Reusable component for subscription alert messages
function SubscriptionAlertMessage({
  icon,
  text,
  color,
}: {
  icon: React.ReactNode
  text: string
  color: string
}) {
  return (
    <div className={`flex items-center gap-2 font-medium ${color}`}>
      {icon}
      <span>{text}</span>
    </div>
  )
}

interface SubscriptionAlertsProps {
  giftInfo: GiftInfo
  statusInfo: StatusInfo | null
  handlePortalAccess: () => Promise<void>
  isLoading: boolean
  hideManageButton?: boolean
  giftSubInfo?: GiftSubInfo
}

export function SubscriptionAlerts({
  giftInfo,
  statusInfo,
  handlePortalAccess,
  isLoading: _isLoading,
  hideManageButton = false,
}: SubscriptionAlertsProps) {
  const {
    subscription,
    isLifetimePlan,
    inGracePeriod,
    hasActivePlan,
    creditBalance,
    formattedCreditBalance,
    isLoading: subContextIsLoading,
  } = useSubscriptionContext()
  const [isApplyingCredits, setIsApplyingCredits] = useState(false)
  const hasStripeCustomer = Boolean(subscription?.stripeCustomerId)

  const isVirtualGracePeriodSubscription =
    (subscription as unknown as SubscriptionWithGiftDetails)?.isGracePeriodVirtual ||
    (inGracePeriod &&
      subscription?.status === 'TRIALING' &&
      !subscription?.stripeSubscriptionId &&
      subscription?.currentPeriodEnd &&
      new Date(subscription.currentPeriodEnd).getTime() === new Date(GRACE_PERIOD_END).getTime())

  // Helper function to create alert styles based on type
  const getAlertStyles = (type: 'success' | 'info' | 'warning' | 'error') => {
    const styles = {
      success: 'border-emerald-800 bg-emerald-950/60 text-emerald-300',
      info: 'border-indigo-800 bg-indigo-950/60 text-indigo-300',
      warning: 'border-amber-800 bg-amber-950/60 text-amber-300',
      error: 'border-red-800 bg-red-950/60 text-red-300',
    }

    return `max-w-2xl rounded-lg border-2 ${styles[type]} shadow-sm`
  }

  // Function to handle applying credits
  const handleApplyCredits = async () => {
    setIsApplyingCredits(true)
    message.loading({ content: 'Applying credits...', key: 'applyCredits' })
    try {
      const response = await fetch('/api/stripe/apply-gift-credit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const result = await response.json()

      if (result.success) {
        // Reload the page to show updated subscription status
        message.success({
          content: 'Credits applied successfully!',
          key: 'applyCredits',
          duration: 2,
        })
        window.location.reload()
      } else {
        // Show error if needed
        console.error('Failed to apply credits:', result.error || result.message)
        message.error({
          content: 'There was an issue applying your credits. Please try again or contact support.',
          key: 'applyCredits',
          duration: 5,
        })
      }
    } catch (error) {
      console.error('Error applying credits:', error)
      message.error({
        content: 'There was an issue applying your credits. Please try again or contact support.',
        key: 'applyCredits',
        duration: 5,
      })
    } finally {
      setIsApplyingCredits(false)
    }
  }

  // Create gift credit alert
  const createCreditAlert = () => {
    if (isInGracePeriod()) return null
    if (creditBalance <= 0) return null

    return (
      <Alert
        className={getAlertStyles('info')}
        message={
          <SubscriptionAlertMessage
            icon={<GiftIcon size={18} className='text-indigo-400' />}
            text='Credit Balance Available'
            color='text-indigo-300'
          />
        }
        description={
          <div className='mt-1 text-indigo-300'>
            <p>
              You have {formattedCreditBalance} credit that will be automatically applied to your
              subscription.
            </p>
            <p className='mt-1 text-sm'>
              {hasActivePlan
                ? 'This credit will be applied to your next invoice automatically.'
                : "If you don't have an active subscription, it will be applied at checkout when you subscribe."}
            </p>

            {/* Add Apply Credits button if user doesn't have an active plan */}
            {!hasActivePlan && (
              <Button
                type='primary'
                size='small'
                className='mt-2 bg-indigo-600 hover:bg-indigo-700'
                onClick={handleApplyCredits}
                loading={isApplyingCredits}
                disabled={isApplyingCredits}
              >
                {isApplyingCredits ? 'Applying...' : 'Apply Credits Now'}
              </Button>
            )}
          </div>
        }
        type='info'
        showIcon={false}
      />
    )
  }

  if (subContextIsLoading) {
    return (
      <div className='space-y-4 gap-4 flex flex-col'>
        <Skeleton.Input active size='large' className='w-full' />
      </div>
    )
  }

  return (
    <div className='space-y-4 gap-4 flex flex-col'>
      {/* Credit Balance Alert */}
      {creditBalance > 0 &&
        !hasActivePlan &&
        !isVirtualGracePeriodSubscription &&
        createCreditAlert()}

      {/* Warning alert for subscription ending soon */}
      {statusInfo?.type === 'warning' &&
        !subscription?.isGift &&
        !inGracePeriod &&
        !hideManageButton && (
          <Alert
            message='Subscription Ending Soon'
            description='Your subscription will end soon. Renew to keep access to all Pro features.'
            type='warning'
            showIcon
            action={
              <Button size='small' type='primary' onClick={handlePortalAccess}>
                Renew Now
              </Button>
            }
          />
        )}

      {/* Error alert for PAST_DUE subscription */}
      {statusInfo?.type === 'error' &&
        subscription?.status === 'PAST_DUE' &&
        hasStripeCustomer &&
        !hideManageButton && (
          <Alert
            message='Payment Failed'
            description='Your payment method failed. Update your payment method to restore access to Pro features.'
            type='error'
            showIcon
            action={
              <Button size='small' type='primary' danger onClick={handlePortalAccess}>
                Update Payment
              </Button>
            }
          />
        )}

      {!isLifetimePlan &&
        inGracePeriod &&
        !subscription?.stripeSubscriptionId &&
        !giftInfo.hasGifts && (
          <Alert
            className={getAlertStyles('info')}
            message={
              <SubscriptionAlertMessage
                icon={<ClockIcon size={18} className='text-indigo-400' />}
                text='Complimentary Pro access is active'
                color='text-indigo-300'
              />
            }
            description={
              <div className='mt-1 text-indigo-300'>
                <p>You can keep using Pro features right now without opening Stripe.</p>
              </div>
            }
            type='info'
            showIcon={false}
          />
        )}
    </div>
  )
}
