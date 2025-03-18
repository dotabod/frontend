import { useSubscriptionContext } from '@/contexts/SubscriptionContext'
import { gracePeriodEndNextDay, GRACE_PERIOD_END } from '@/utils/subscription'
import { Button, Alert } from 'antd'
import { ExternalLinkIcon, GiftIcon, ClockIcon, CheckCircleIcon } from 'lucide-react'
import type { GiftInfo, StatusInfo, GiftSubInfo } from './types'
import type { SubscriptionWithGiftDetails } from './types'

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

// Reusable component for grace period information
function GracePeriodInfo({
  inGracePeriod,
  giftCoversPostGracePeriod,
  gracePeriodEndNextDay,
}: {
  inGracePeriod: boolean
  giftCoversPostGracePeriod?: boolean | null
  gracePeriodEndNextDay: string
}) {
  if (!inGracePeriod || !giftCoversPostGracePeriod) return null

  return (
    <p className='mt-2 text-sm'>
      Your gift subscription will activate on {gracePeriodEndNextDay} - you will not be charged
      until after your gift expires.
    </p>
  )
}

// Reusable component for gift sender information
function GiftSenderInfo({
  senderName,
  giftMessage,
}: {
  senderName?: string
  giftMessage?: string
}) {
  return (
    <>
      {senderName && senderName !== 'Anonymous' && (
        <p className='mt-1 text-sm'>Gift from: {senderName}</p>
      )}
      {giftMessage && <p className='mt-1 italic text-sm text-indigo-400'>"{giftMessage}"</p>}
    </>
  )
}

// Credit Balance Information component
function CreditBalanceInfo({
  amount,
  formattedAmount,
}: {
  amount?: number
  formattedAmount?: string
}) {
  if (!amount || amount <= 0) return null

  return (
    <div className='mt-2 border-t border-indigo-800/50 pt-2'>
      <p className='flex items-center gap-1 text-sm'>
        <GiftIcon className='h-4 w-4 text-indigo-400' />
        <span className='font-medium text-indigo-300'>Credit Balance</span>
      </p>
      <p className='mt-1 text-sm'>
        You have {formattedAmount} credit balance that will be automatically applied to your
        subscription.
      </p>
      <p className='mt-1 text-xs text-indigo-400'>
        If you currently have an active subscription, this credit will be applied to your next
        invoice. If you don't have a subscription, this credit will be applied when you subscribe.
      </p>
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
  isLoading,
  giftSubInfo,
  hideManageButton = false,
}: SubscriptionAlertsProps) {
  const {
    subscription,
    isLifetimePlan,
    inGracePeriod,
    hasActivePlan,
    creditBalance,
    formattedCreditBalance,
  } = useSubscriptionContext()

  // Only show manage subscription button for recurring subscriptions with Stripe
  const showManageButton =
    !hideManageButton && hasActivePlan && subscription?.stripeSubscriptionId && !isLifetimePlan

  // Helper function to find the latest gift end date
  const getLatestGiftEndDate = () => {
    if (!giftInfo.giftSubscriptions?.length) return null

    return giftInfo.giftSubscriptions.reduce(
      (latest, gift) => {
        if (!gift.endDate) return latest
        if (!latest) return gift.endDate
        return new Date(gift.endDate) > new Date(latest) ? gift.endDate : latest
      },
      null as Date | null,
    )
  }

  // Extract latest gift end date if available
  const latestGiftEndDate = getLatestGiftEndDate()

  // Check if grace period virtual subscription
  const isVirtualGracePeriodSubscription =
    (subscription as unknown as SubscriptionWithGiftDetails)?.isGracePeriodVirtual ||
    (inGracePeriod &&
      subscription?.status === 'TRIALING' &&
      !subscription?.stripeSubscriptionId &&
      subscription?.currentPeriodEnd &&
      new Date(subscription.currentPeriodEnd).getTime() === new Date(GRACE_PERIOD_END).getTime())

  // Show grace period alert when appropriate
  const shouldShowGracePeriodAlert =
    !isLifetimePlan &&
    inGracePeriod &&
    !isVirtualGracePeriodSubscription &&
    !(
      giftInfo.hasGifts &&
      giftInfo.giftSubscriptions?.some(
        (gift) => gift.endDate && new Date(gift.endDate) > new Date(),
      )
    )

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

  // Create gift credit alert
  const createCreditAlert = () => {
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
          </div>
        }
        type='info'
        showIcon={false}
      />
    )
  }

  const GiftSubtitle = createCreditAlert()

  return (
    <div className='space-y-4 gap-4 flex flex-col'>
      {/* Manage subscription button */}
      {showManageButton && (
        <Button
          type='primary'
          size='middle'
          icon={<ExternalLinkIcon size={14} />}
          onClick={handlePortalAccess}
          disabled={isLoading}
        >
          {isLoading ? 'Loading...' : 'Manage subscription'}
        </Button>
      )}

      {/* Credit Balance Alert */}
      {creditBalance > 0 && createCreditAlert()}

      {/* Primary subscription status alert - prioritize showing the most important information */}
      {/* For lifetime gift subscriptions */}
      {isLifetimePlan ? (
        /* For regular lifetime subscriptions */
        <Alert
          className={getAlertStyles('success')}
          message={
            <SubscriptionAlertMessage
              icon={<CheckCircleIcon size={18} className='text-emerald-400' />}
              text='Lifetime Access'
              color='text-emerald-300'
            />
          }
          description='Thank you for being a lifetime supporter!'
          type='success'
          showIcon={false}
        />
      ) : statusInfo?.message ? (
        <Alert
          className={getAlertStyles(statusInfo.type)}
          message={
            <SubscriptionAlertMessage
              icon={
                statusInfo.type === 'success' ? (
                  <CheckCircleIcon size={18} className='text-emerald-400' />
                ) : (
                  <ClockIcon size={18} className='text-indigo-400' />
                )
              }
              text={statusInfo.message}
              color='text-indigo-300'
            />
          }
          description={
            <div className='mt-1 text-indigo-300'>
              {subscription?.metadata &&
              (subscription.metadata as Record<string, unknown>).giftExtendedUntil ? (
                <p>
                  Your subscription will {subscription.cancelAtPeriodEnd ? 'end' : 'renew'} on{' '}
                  {subscription.currentPeriodEnd &&
                    new Date(subscription.currentPeriodEnd).toLocaleDateString()}
                </p>
              ) : (
                subscription?.currentPeriodEnd && (
                  <p>
                    Your subscription will {subscription.cancelAtPeriodEnd ? 'end' : 'renew'} on{' '}
                    {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
                  </p>
                )
              )}

              {/* Add credit balance information if available */}
              <CreditBalanceInfo amount={creditBalance} formattedAmount={formattedCreditBalance} />

              <GracePeriodInfo
                inGracePeriod={inGracePeriod}
                giftCoversPostGracePeriod={false}
                gracePeriodEndNextDay={gracePeriodEndNextDay}
              />
            </div>
          }
          type={statusInfo.type}
          showIcon={false}
        />
      ) : null}

      {/* Grace period alert */}
      {shouldShowGracePeriodAlert && GiftSubtitle}

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
    </div>
  )
}
