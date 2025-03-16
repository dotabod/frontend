import { useSubscriptionContext } from '@/contexts/SubscriptionContext'
import {
  isSubscriptionActive,
  gracePeriodPrettyDate,
  gracePeriodEndNextDay,
  GRACE_PERIOD_END,
} from '@/utils/subscription'
import { Button, Alert, Timeline } from 'antd'
import { ExternalLinkIcon, GiftIcon, CalendarIcon, ClockIcon, CheckCircleIcon } from 'lucide-react'
import type { GiftInfo, StatusInfo, GiftSubInfo } from './types'
import type { SubscriptionWithGiftDetails } from './types'
import type { JsonValue } from '@prisma/client/runtime/library'

// Helper function to format dates consistently
const formatDate = (date: Date | string | null, format: 'short' | 'long' = 'short'): string => {
  if (!date) return ''

  const dateObj = typeof date === 'string' ? new Date(date) : date

  return format === 'short'
    ? dateObj.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    : dateObj.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })
}

// Timeline component to visualize subscription periods using Ant Design Timeline
function SubscriptionTimeline({
  gracePeriodEnd,
  giftStartDate,
  giftEndDate,
  renewalDate,
  hasActivePlan,
  cancelAtPeriodEnd,
}: {
  gracePeriodEnd: Date
  giftStartDate: Date
  giftEndDate: Date
  renewalDate?: Date
  hasActivePlan: boolean
  cancelAtPeriodEnd?: boolean
}) {
  const now = new Date()
  const showGracePeriod = now < gracePeriodEnd

  // Create timeline items based on subscription state
  const timelineItems = [
    // Current date marker
    {
      color: 'blue',
      children: (
        <div className='text-white'>
          <span className='font-medium'>Now</span>
          <span className='text-xs ml-2 text-gray-400'>{formatDate(now)}</span>
        </div>
      ),
    },
    // Grace period end (if applicable)
    ...(showGracePeriod
      ? [
          {
            color: 'orange',
            children: (
              <div className='text-amber-300'>
                <span className='font-medium'>Free period ends</span>
                <span className='text-xs ml-2 text-amber-400'>{formatDate(gracePeriodEnd)}</span>
              </div>
            ),
          },
        ]
      : []),
    // Gift sub start (if different from grace period end)
    ...(showGracePeriod
      ? [
          {
            color: 'purple',
            children: (
              <div className='text-indigo-300'>
                <span className='font-medium'>Gift sub begins</span>
                <span className='text-xs ml-2 text-indigo-400'>{formatDate(giftStartDate)}</span>
              </div>
            ),
          },
        ]
      : []),
    // Gift sub end
    {
      color: 'purple',
      children: (
        <div className='text-indigo-300'>
          <span className='font-medium'>Gift sub ends</span>
          <span className='text-xs ml-2 text-indigo-400'>{formatDate(giftEndDate)}</span>
        </div>
      ),
    },
    // Paid subscription (if applicable)
    ...(hasActivePlan && renewalDate && !cancelAtPeriodEnd
      ? [
          {
            color: 'green',
            children: (
              <div className='text-emerald-300'>
                <span className='font-medium'>Paid subscription begins</span>
                <span className='text-xs ml-2 text-emerald-400'>{formatDate(renewalDate)}</span>
              </div>
            ),
          },
        ]
      : []),
    // Subscription ends (if cancelAtPeriodEnd)
    ...(hasActivePlan && renewalDate && cancelAtPeriodEnd
      ? [
          {
            color: 'red',
            children: (
              <div className='text-red-300'>
                <span className='font-medium'>Dotabod Pro ends</span>
                <span className='text-xs ml-2 text-red-400'>{formatDate(giftEndDate)}</span>
                <div className='text-xs text-gray-400 mt-1'>No further charges</div>
              </div>
            ),
          },
        ]
      : []),
  ]

  return (
    <div className='flex flex-col items-center'>
      <h4 className='text-sm font-medium text-indigo-200'>Subscription Timeline</h4>
      <Timeline items={timelineItems} />

      {/* Summary text */}
      <div className='text-xs text-gray-300'>
        <p>
          {showGracePeriod
            ? `Free until ${formatDate(gracePeriodEnd)} → Gift until ${formatDate(giftEndDate)}`
            : `Gift until ${formatDate(giftEndDate)}`}
          {hasActivePlan &&
            renewalDate &&
            !cancelAtPeriodEnd &&
            ` → Paid begins ${formatDate(renewalDate)}`}
          {hasActivePlan && cancelAtPeriodEnd && ' → Dotabod Pro ends'}
        </p>
      </div>
    </div>
  )
}

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

// Reusable component for billing information
function BillingInfo({
  subscription,
  formattedGiftExpirationDate,
  formattedRenewalDate,
  hasActivePlan,
  isLifetimePlan,
}: {
  subscription?: {
    cancelAtPeriodEnd?: boolean
    metadata?: JsonValue
  } | null
  formattedGiftExpirationDate: string
  formattedRenewalDate: string
  hasActivePlan: boolean
  isLifetimePlan: boolean
}) {
  if (isLifetimePlan) return null

  if (!hasActivePlan && formattedGiftExpirationDate) {
    return (
      <p className='mt-1 text-sm font-medium'>
        Billing starts {formattedGiftExpirationDate} unless canceled.
      </p>
    )
  }

  if (hasActivePlan && subscription?.metadata) {
    return (
      <p className='mt-1 text-sm font-medium'>
        {subscription.cancelAtPeriodEnd
          ? `Dotabod Pro ends after gift sub (${formattedGiftExpirationDate}). No further charges.`
          : `Gift used before paid subscription. Billing cycle resumes on ${formattedRenewalDate}.`}
      </p>
    )
  }

  return null
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
  if (!inGracePeriod) return null

  return (
    <p className='mt-2 text-sm'>
      <span className='font-medium'>Note:</span> All users currently have free Pro access until{' '}
      {gracePeriodPrettyDate}.
      {giftCoversPostGracePeriod
        ? ` Your gift subscription will activate on ${gracePeriodEndNextDay} - you will not be charged until after your gift expires.`
        : ` Your paid subscription will begin on ${gracePeriodEndNextDay}.`}
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
  const { subscription, isLifetimePlan, inGracePeriod, hasActivePlan } = useSubscriptionContext()

  // Determine if the user has both a regular subscription and gift subscription
  const hasBothSubscriptionTypes =
    isSubscriptionActive({ status: subscription?.status }) &&
    !subscription?.isGift &&
    giftInfo.hasGifts

  // Only show manage subscription button for recurring subscriptions with Stripe
  const showManageButton =
    !hideManageButton &&
    isSubscriptionActive({ status: subscription?.status }) &&
    subscription?.stripeSubscriptionId &&
    !isLifetimePlan &&
    !subscription?.isGift

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

  // Determine if gift subscription will start after grace period
  const isGiftAfterGracePeriod = () => {
    if (!giftInfo.hasGifts || !giftInfo.giftSubscriptions?.length || !inGracePeriod) return false

    const latestGiftEndDate = getLatestGiftEndDate()
    if (!latestGiftEndDate) return false

    const gracePeriodEndDate = new Date(GRACE_PERIOD_END)
    return new Date(latestGiftEndDate) > gracePeriodEndDate
  }

  // Check if the user has an active gift subscription
  const hasActiveGiftSubscription =
    giftInfo.hasGifts &&
    giftInfo.giftSubscriptions?.some((gift) => gift.endDate && new Date(gift.endDate) > new Date())

  const latestGiftEndDate = getLatestGiftEndDate()
  const formattedGiftExpirationDate = formatDate(latestGiftEndDate, 'long')

  // Check if this is a virtual subscription created for the grace period
  const isVirtualGracePeriodSubscription =
    (subscription as unknown as SubscriptionWithGiftDetails)?.isGracePeriodVirtual ||
    (inGracePeriod &&
      subscription?.status === 'TRIALING' &&
      !subscription?.stripeSubscriptionId &&
      subscription?.currentPeriodEnd &&
      new Date(subscription.currentPeriodEnd).getTime() === new Date(GRACE_PERIOD_END).getTime())

  // Determine if we should show the grace period alert
  const shouldShowGracePeriodAlert =
    !isLifetimePlan &&
    inGracePeriod &&
    !isVirtualGracePeriodSubscription &&
    !hasActiveGiftSubscription

  // Check if gift extends beyond grace period
  const giftCoversPostGracePeriod =
    hasActiveGiftSubscription &&
    latestGiftEndDate &&
    new Date(latestGiftEndDate) > new Date(GRACE_PERIOD_END)

  // Get the actual renewal date from metadata if available
  const getActualRenewalDate = () => {
    if (!subscription || !subscription.metadata) return null

    const metadata = subscription.metadata as Record<string, unknown>
    if (metadata.giftExtendedUntil) {
      // Add one day to the gift expiration date to get the renewal date
      const renewalDate = new Date(metadata.giftExtendedUntil as string)
      renewalDate.setDate(renewalDate.getDate() + 1)
      return renewalDate
    }

    return subscription.currentPeriodEnd
  }

  const actualRenewalDate = getActualRenewalDate()
  const formattedRenewalDate = actualRenewalDate
    ? new Date(actualRenewalDate).toLocaleDateString()
    : subscription?.currentPeriodEnd
      ? new Date(subscription.currentPeriodEnd).toLocaleDateString()
      : ''

  // Helper function to render subscription timeline
  const renderTimeline = () => {
    if (!latestGiftEndDate) return null

    return (
      <SubscriptionTimeline
        gracePeriodEnd={new Date(GRACE_PERIOD_END)}
        giftStartDate={inGracePeriod ? new Date(GRACE_PERIOD_END) : new Date()}
        giftEndDate={new Date(latestGiftEndDate)}
        renewalDate={actualRenewalDate ? new Date(actualRenewalDate) : undefined}
        hasActivePlan={!isLifetimePlan && hasActivePlan}
        cancelAtPeriodEnd={subscription?.cancelAtPeriodEnd}
      />
    )
  }

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

      {/* Primary subscription status alert - prioritize showing the most important information */}
      {/* For lifetime gift subscriptions */}
      {(isLifetimePlan || giftInfo.hasLifetime) && giftSubInfo?.isGift ? (
        <Alert
          className={getAlertStyles('success')}
          message={
            <SubscriptionAlertMessage
              icon={<CheckCircleIcon size={18} className='text-emerald-400' />}
              text='Lifetime Access'
              color='text-emerald-300'
            />
          }
          description={
            <div className='mt-1 text-emerald-300'>
              <p>
                Someone gifted you lifetime access to Dotabod Pro. Enjoy all premium features
                forever!
              </p>
              <GiftSenderInfo
                senderName={giftSubInfo.senderName}
                giftMessage={giftSubInfo.giftMessage}
              />
            </div>
          }
          type='success'
          showIcon={false}
        />
      ) : isLifetimePlan ? (
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
      ) : hasActiveGiftSubscription ? (
        /* If user has an active gift subscription */
        <Alert
          className={getAlertStyles('info')}
          message={
            <SubscriptionAlertMessage
              icon={<GiftIcon size={18} className='text-indigo-400' />}
              text='Gift Subscription Active'
              color='text-indigo-300'
            />
          }
          description={
            <div className='mt-1 text-indigo-300'>
              <p>
                {isGiftAfterGracePeriod()
                  ? `Gift activates ${gracePeriodEndNextDay} until ${formattedGiftExpirationDate}`
                  : `Gift active until ${formattedGiftExpirationDate}`}
              </p>

              {/* Add timeline visualization */}
              {latestGiftEndDate && inGracePeriod && renderTimeline()}

              {/* Billing information */}
              <BillingInfo
                subscription={subscription}
                formattedGiftExpirationDate={formattedGiftExpirationDate}
                formattedRenewalDate={formattedRenewalDate}
                hasActivePlan={hasActivePlan}
                isLifetimePlan={isLifetimePlan}
              />
            </div>
          }
          type='info'
          showIcon={false}
        />
      ) : subscription?.isGift ? (
        /* If the primary subscription is a gift */
        <Alert
          className={getAlertStyles('info')}
          message={
            <SubscriptionAlertMessage
              icon={<GiftIcon size={18} className='text-indigo-400' />}
              text='Gift Subscription'
              color='text-indigo-300'
            />
          }
          description={
            <div className='mt-1 text-indigo-300'>
              {giftSubInfo?.message}
              <GiftSenderInfo
                senderName={giftSubInfo?.senderName}
                giftMessage={giftSubInfo?.giftMessage}
              />
              <GracePeriodInfo
                inGracePeriod={inGracePeriod}
                giftCoversPostGracePeriod={giftCoversPostGracePeriod}
                gracePeriodEndNextDay={gracePeriodEndNextDay}
              />
            </div>
          }
          type={statusInfo?.type || 'info'}
          showIcon={false}
        />
      ) : isVirtualGracePeriodSubscription ? (
        /* For virtual subscriptions created during grace period */
        <Alert
          className={getAlertStyles('warning')}
          message={
            <SubscriptionAlertMessage
              icon={<CalendarIcon size={18} className='text-amber-400' />}
              text='Free Pro Access Period'
              color='text-amber-300'
            />
          }
          description={
            <div className='mt-1 text-amber-300'>
              <p>All users have free Pro access until {gracePeriodPrettyDate}.</p>
              {isGiftAfterGracePeriod() && (
                <div>
                  <p className='mt-1'>
                    Gift activates {gracePeriodEndNextDay}
                    {formattedGiftExpirationDate && (
                      <span> until {formattedGiftExpirationDate}</span>
                    )}
                  </p>

                  {/* Add timeline visualization */}
                  {renderTimeline()}

                  <BillingInfo
                    subscription={subscription}
                    formattedGiftExpirationDate={formattedGiftExpirationDate}
                    formattedRenewalDate={formattedRenewalDate}
                    hasActivePlan={hasActivePlan}
                    isLifetimePlan={isLifetimePlan}
                  />
                </div>
              )}
            </div>
          }
          type='warning'
          showIcon={false}
        />
      ) : statusInfo?.message && !statusInfo.message.includes('Gift subscription') ? (
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
                  {formattedRenewalDate}
                </p>
              ) : (
                subscription?.currentPeriodEnd && (
                  <p>
                    Your subscription will {subscription.cancelAtPeriodEnd ? 'end' : 'renew'} on{' '}
                    {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
                  </p>
                )
              )}

              {/* Add timeline for regular subscription with gift */}
              {hasActiveGiftSubscription && renderTimeline()}

              {/* Show gift subscription info if user has a gift subscription */}
              {hasActiveGiftSubscription && (
                <div className='mt-2 border-t border-indigo-800/50 pt-2'>
                  <p className='flex items-center gap-1 text-sm'>
                    <GiftIcon className='h-4 w-4 text-indigo-400' />
                    <span className='font-medium text-indigo-300'>Gift Subscription</span>
                  </p>
                  <p className='mt-1 text-sm'>
                    {formattedGiftExpirationDate &&
                    new Date(formattedGiftExpirationDate) > new Date()
                      ? `You also have a gift subscription active until ${formattedGiftExpirationDate}`
                      : 'Your gift subscription has expired'}
                  </p>
                  {giftInfo.giftSubscriptions && giftInfo.giftSubscriptions.length > 0 && (
                    <p className='mt-1 text-xs text-indigo-400'>
                      From: {giftInfo.giftSubscriptions[0].senderName}
                      {giftInfo.giftSubscriptions.length > 1 &&
                        ` and ${giftInfo.giftSubscriptions.length - 1} others`}
                    </p>
                  )}
                </div>
              )}

              <GracePeriodInfo
                inGracePeriod={inGracePeriod}
                giftCoversPostGracePeriod={giftCoversPostGracePeriod}
                gracePeriodEndNextDay={gracePeriodEndNextDay}
              />
            </div>
          }
          type={statusInfo.type}
          showIcon={false}
        />
      ) : null}

      {/* Grace period alert */}
      {shouldShowGracePeriodAlert && (
        <Alert
          className={getAlertStyles('warning')}
          message={
            <SubscriptionAlertMessage
              icon={<CalendarIcon size={18} className='text-amber-400' />}
              text='Free Pro Access Period'
              color='text-amber-300'
            />
          }
          description={
            <div className='mt-1 text-amber-300'>
              <p>All users have free Pro access until {gracePeriodPrettyDate}.</p>
              {isGiftAfterGracePeriod() && (
                <div>
                  <p className='mt-1'>
                    Gift activates {gracePeriodEndNextDay}
                    {formattedGiftExpirationDate && (
                      <span> until {formattedGiftExpirationDate}</span>
                    )}
                  </p>

                  {/* Add timeline visualization */}
                  {renderTimeline()}

                  <BillingInfo
                    subscription={subscription}
                    formattedGiftExpirationDate={formattedGiftExpirationDate}
                    formattedRenewalDate={formattedRenewalDate}
                    hasActivePlan={hasActivePlan}
                    isLifetimePlan={isLifetimePlan}
                  />
                </div>
              )}
            </div>
          }
          type='warning'
          showIcon={false}
        />
      )}

      {/* Gift info for users with gift subscriptions */}
      {giftInfo.hasGifts && !subscription?.isGift && !formattedGiftExpirationDate && (
        <Alert
          className={getAlertStyles('info')}
          message={
            <SubscriptionAlertMessage
              icon={<GiftIcon size={18} className='text-indigo-400' />}
              text='Gift Subscriptions'
              color='text-indigo-300'
            />
          }
          description={giftInfo.giftMessage}
          type='info'
          showIcon={false}
        />
      )}

      {/* Special alert for users with both subscription types */}
      {hasBothSubscriptionTypes &&
        subscription &&
        !formattedGiftExpirationDate &&
        !(statusInfo?.message && giftInfo.hasGifts) && (
          <Alert
            message='You Have Multiple Subscriptions'
            description={
              <div>
                <p>You have both a regular subscription and gift subscription(s).</p>
                {formattedGiftExpirationDate && subscription.currentPeriodEnd && (
                  <p>
                    Your gift subscription{giftInfo.giftCount > 1 ? 's' : ''} will extend your Pro
                    access
                    {subscription.cancelAtPeriodEnd
                      ? ` after your current subscription ends on ${formattedRenewalDate}.`
                      : '.'}
                  </p>
                )}
              </div>
            }
            type='info'
            showIcon
            icon={<GiftIcon className='text-indigo-400' />}
            className='border-2 border-indigo-800 bg-indigo-950/60 text-indigo-300'
          />
        )}

      {/* Warning alert for subscription ending soon */}
      {statusInfo?.type === 'warning' &&
        !subscription?.isGift &&
        !inGracePeriod &&
        !hideManageButton && (
          <Alert
            message='Subscription Ending Soon'
            description={
              giftInfo.hasGifts
                ? 'Your paid subscription will end soon, but you have gift subscription(s) that will extend your access.'
                : 'Your subscription will end soon. Renew to keep access to all Pro features.'
            }
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
