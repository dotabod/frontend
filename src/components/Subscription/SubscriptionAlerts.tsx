import { Button, message, Skeleton } from 'antd'
import { AlertTriangleIcon, ClockIcon, CreditCardIcon, GiftIcon } from 'lucide-react'
import { useState } from 'react'
import { BillingNotice } from '@/components/Billing/BillingNotice'
import { useSubscriptionContext } from '@/contexts/SubscriptionContext'
import { GRACE_PERIOD_END, isInGracePeriod } from '@/utils/subscription'
import type { GiftInfo, GiftSubInfo, StatusInfo } from './types'

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
    (!!subscription &&
      'isGracePeriodVirtual' in subscription &&
      Boolean(subscription.isGracePeriodVirtual)) ||
    (inGracePeriod &&
      subscription?.status === 'TRIALING' &&
      !subscription?.stripeSubscriptionId &&
      subscription?.currentPeriodEnd &&
      new Date(subscription.currentPeriodEnd).getTime() === new Date(GRACE_PERIOD_END).getTime())

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
        message.success({
          content: 'Credits applied successfully!',
          key: 'applyCredits',
          duration: 2,
        })
        window.location.reload()
      } else {
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

  const createCreditAlert = () => {
    if (isInGracePeriod()) return null
    if (creditBalance <= 0) return null

    return (
      <BillingNotice
        tone='info'
        icon={<GiftIcon size={18} />}
        title='Credit balance available'
        action={
          !hasActivePlan ? (
            <Button
              type='primary'
              size='small'
              onClick={handleApplyCredits}
              loading={isApplyingCredits}
              disabled={isApplyingCredits}
            >
              {isApplyingCredits ? 'Applying…' : 'Apply credits now'}
            </Button>
          ) : undefined
        }
      >
        <p>
          You have {formattedCreditBalance} credit that will be applied to your subscription
          automatically.
        </p>
        <p className='mt-1'>
          {hasActivePlan
            ? 'It goes toward your next invoice.'
            : 'It gets applied at checkout when you subscribe.'}
        </p>
      </BillingNotice>
    )
  }

  if (subContextIsLoading) {
    return (
      <div className='flex flex-col gap-4'>
        <Skeleton.Input active size='large' className='w-full' />
      </div>
    )
  }

  return (
    <div className='flex flex-col gap-4'>
      {creditBalance > 0 &&
        !hasActivePlan &&
        !isVirtualGracePeriodSubscription &&
        createCreditAlert()}

      {statusInfo?.type === 'warning' &&
        !subscription?.isGift &&
        !inGracePeriod &&
        !hideManageButton && (
          <BillingNotice
            tone='warning'
            icon={<ClockIcon size={18} />}
            title='Subscription ending soon'
            action={
              <Button size='small' type='primary' onClick={handlePortalAccess}>
                Renew now
              </Button>
            }
          >
            Renew to keep access to all Pro features.
          </BillingNotice>
        )}

      {statusInfo?.type === 'error' &&
        subscription?.status === 'PAST_DUE' &&
        hasStripeCustomer &&
        !hideManageButton && (
          <BillingNotice
            tone='error'
            icon={<CreditCardIcon size={18} />}
            title='Payment failed'
            action={
              <Button size='small' type='primary' danger onClick={handlePortalAccess}>
                Update payment
              </Button>
            }
          >
            Your payment method failed. Update it to restore access to Pro features.
          </BillingNotice>
        )}

      {!isLifetimePlan &&
        inGracePeriod &&
        !subscription?.stripeSubscriptionId &&
        !giftInfo.hasGifts && (
          <BillingNotice
            tone='info'
            icon={<AlertTriangleIcon size={18} />}
            title='Complimentary Pro access is active'
          >
            You can keep using Pro features right now without opening Stripe.
          </BillingNotice>
        )}
    </div>
  )
}
