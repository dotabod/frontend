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

// Helper function to format dates consistently
const formatDate = (date: Date | string | null, format: 'short' | 'long' = 'short'): string => {
  if (!date) return ''

  const dateObj = typeof date === 'string' ? new Date(date) : date

  return format === 'short'
    ? dateObj.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
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
  paidPeriodEnd,
}: {
  gracePeriodEnd: Date
  giftStartDate: Date
  giftEndDate: Date
  renewalDate?: Date
  hasActivePlan: boolean
  cancelAtPeriodEnd?: boolean
  hasPostPaidGift?: boolean
  paidPeriodEnd?: Date
}) {
  const now = new Date()
  const showGracePeriod = now < gracePeriodEnd

  // Determine if the user has a paid subscription that starts during the grace period
  const hasPaidDuringGracePeriod =
    hasActivePlan && paidPeriodEnd && paidPeriodEnd > now && paidPeriodEnd > gracePeriodEnd

  // Create timeline items based on subscription state
  const timelineItems = [
    // Current date marker
    {
      color: 'blue',
      label: formatDate(now),
      children: (
        <div className='text-white'>
          <span className='font-medium'>Now</span>
        </div>
      ),
    },
    // Grace period end (if applicable)
    ...(showGracePeriod
      ? [
          {
            color: 'orange',
            label: formatDate(gracePeriodEnd),
            children: (
              <div className='text-amber-300'>
                <span className='font-medium'>Free period ends</span>
              </div>
            ),
          },
        ]
      : []),
    // Current paid period end (if applicable and not during grace period)
    ...(hasActivePlan && paidPeriodEnd && paidPeriodEnd > now && !showGracePeriod
      ? [
          {
            color: 'green',
            label: formatDate(paidPeriodEnd),
            children: (
              <div className='text-emerald-300'>
                <span className='font-medium'>
                  {giftStartDate > now && giftStartDate.getTime() === paidPeriodEnd.getTime()
                    ? 'Subscription ends'
                    : 'Current paid period ends'}
                </span>
              </div>
            ),
          },
        ]
      : []),
    // Gift sub start (if different from now and after grace period)
    ...(giftStartDate > now
      ? [
          {
            color: 'purple',
            label: formatDate(giftStartDate),
            children: (
              <div className='text-indigo-300'>
                <span className='font-medium'>
                  {hasActivePlan &&
                  paidPeriodEnd &&
                  giftStartDate.getTime() === paidPeriodEnd.getTime()
                    ? 'Gift sub begins (subscription paused)'
                    : showGracePeriod && giftStartDate.getTime() === gracePeriodEnd.getTime()
                      ? 'Gift sub begins after free period'
                      : 'Gift sub begins'}
                </span>
              </div>
            ),
          },
        ]
      : []),
    // Gift sub end
    {
      color: 'purple',
      label: formatDate(giftEndDate),
      children: (
        <div className='text-indigo-300'>
          <span className='font-medium'>Gift sub ends</span>
        </div>
      ),
    },
    // Paid subscription (if applicable)
    ...(hasActivePlan && renewalDate && !cancelAtPeriodEnd
      ? [
          {
            color: 'green',
            label: formatDate(renewalDate),
            children: (
              <div className='text-emerald-300'>
                <span className='font-medium'>Subscription resumes</span>
              </div>
            ),
          },
        ]
      : []),
    // Subscription ends (if cancelAtPeriodEnd or if only gift subscription and no other subscription)
    ...((hasActivePlan && paidPeriodEnd && renewalDate && cancelAtPeriodEnd) || !hasActivePlan
      ? [
          {
            color: 'red',
            label: formatDate(giftEndDate),
            children: (
              <div className='text-red-300'>
                <span className='font-medium'>Dotabod Pro ends</span>
                <div className='text-xs text-gray-400 mt-1'>No further charges</div>
              </div>
            ),
          },
        ]
      : []),
  ]

  // Create a summary text based on the subscription state
  let summaryText = ''
  let hasAddedRenewalInfo = false

  if (showGracePeriod) {
    // User is in grace period - this takes precedence over everything else
    summaryText = `Free until ${formatDate(gracePeriodEnd)}`

    if (giftStartDate >= gracePeriodEnd) {
      // Gift starts after grace period
      summaryText += ` → Gift until ${formatDate(giftEndDate)}`

      // Add renewal info if applicable
      if (hasActivePlan && renewalDate && !cancelAtPeriodEnd) {
        summaryText += ` → Subscription resumes ${formatDate(renewalDate)}`
        hasAddedRenewalInfo = true
      } else if (hasActivePlan && cancelAtPeriodEnd) {
        summaryText += ' → Dotabod Pro ends'
        hasAddedRenewalInfo = true
      } else if (!hasActivePlan) {
        summaryText += ' → Dotabod Pro ends'
        hasAddedRenewalInfo = true
      }
    }
  } else if (hasPaidDuringGracePeriod) {
    // User has a paid subscription during grace period
    summaryText = `Paid until ${formatDate(paidPeriodEnd)}`

    if (giftStartDate > now) {
      // Gift starts after current period
      summaryText += ` → Gift until ${formatDate(giftEndDate)}`
    }
  } else if (giftStartDate <= now) {
    // Gift is active now
    summaryText = `Gift until ${formatDate(giftEndDate)}`

    // Add "Dotabod Pro ends" for gift-only subscriptions
    if (!hasActivePlan && !renewalDate) {
      summaryText += ' → Dotabod Pro ends'
      hasAddedRenewalInfo = true
    }
  } else {
    // Gift starts in the future
    const isPaused =
      hasActivePlan && paidPeriodEnd && giftStartDate.getTime() === paidPeriodEnd.getTime()

    if (isPaused) {
      summaryText = `Subscription until ${formatDate(paidPeriodEnd)} → Gift until ${formatDate(giftEndDate)}`
    } else {
      summaryText = `Gift starts ${formatDate(giftStartDate)} → Gift until ${formatDate(giftEndDate)}`
    }

    // Add "Dotabod Pro ends" for gift-only subscriptions
    if (!hasActivePlan && !renewalDate) {
      summaryText += ' → Dotabod Pro ends'
      hasAddedRenewalInfo = true
    }
  }

  // Add renewal info - only if user actually has an active paid plan and we haven't added it yet
  if (!hasAddedRenewalInfo) {
    if (hasActivePlan && paidPeriodEnd && renewalDate && !cancelAtPeriodEnd) {
      summaryText += ` → Subscription resumes ${formatDate(renewalDate)}`
    } else if (hasActivePlan && paidPeriodEnd && cancelAtPeriodEnd) {
      summaryText += ' → Dotabod Pro ends'
    }
  }

  return (
    <div className='flex flex-col items-center'>
      <h4 className='text-sm font-medium text-indigo-200'>Subscription Timeline</h4>
      <Timeline mode='left' items={timelineItems} className='w-full' />

      {/* Summary text */}
      <div className='text-xs text-gray-300'>
        <p>{summaryText}</p>
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

    // If the subscription is paused for a gift, use the giftExtendedUntil date
    if (metadata.giftExtendedUntil) {
      // Add one day to the gift expiration date to get the renewal date
      const renewalDate = new Date(metadata.giftExtendedUntil as string)
      renewalDate.setDate(renewalDate.getDate() + 1)
      return renewalDate
    }

    // If the subscription has a post-paid gift (gift that will be applied after the current paid period)
    // we still want to show the current period end as the renewal date
    if (metadata.hasPostPaidGift === 'true' && metadata.giftExpirationDate) {
      // The current period end is still the correct renewal date
      // The gift will start after this date
      return subscription.currentPeriodEnd
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

    // Check if this is a post-paid gift (gift that will be applied after the current paid period)
    const metadata = subscription?.metadata as Record<string, unknown> | undefined
    const hasPostPaidGift = metadata?.hasPostPaidGift === 'true'
    const giftExpirationDate =
      hasPostPaidGift && metadata?.giftExpirationDate
        ? new Date(metadata.giftExpirationDate as string)
        : new Date(latestGiftEndDate)

    // Determine the correct gift start date
    // If we're in the grace period, the gift should start after grace period
    // If user has an active paid subscription, the gift should start after current period
    // Otherwise, it starts now
    let effectiveGiftStartDate: Date

    if (inGracePeriod) {
      // If in grace period, gift starts after grace period
      effectiveGiftStartDate = new Date(GRACE_PERIOD_END)
    } else if (subscription?.currentPeriodEnd && !subscription.isGift && hasActivePlan) {
      // If user has an active paid subscription, gift starts after current period
      effectiveGiftStartDate = new Date(subscription.currentPeriodEnd)
    } else {
      // Otherwise, gift starts now
      effectiveGiftStartDate = new Date()
    }

    // Determine if the user actually has a paid subscription (not just a gift or virtual subscription)
    // This is the key fix - we need to check if they have a real paid subscription
    const hasPaidSubscription =
      hasActivePlan &&
      !!subscription?.stripeSubscriptionId &&
      !subscription.isGift &&
      !(subscription as unknown as SubscriptionWithGiftDetails)?.isVirtual

    return (
      <SubscriptionTimeline
        gracePeriodEnd={new Date(GRACE_PERIOD_END)}
        giftStartDate={effectiveGiftStartDate}
        giftEndDate={giftExpirationDate}
        renewalDate={actualRenewalDate ? new Date(actualRenewalDate) : undefined}
        hasActivePlan={hasPaidSubscription}
        cancelAtPeriodEnd={hasPaidSubscription ? subscription?.cancelAtPeriodEnd : undefined}
        hasPostPaidGift={hasPostPaidGift}
        paidPeriodEnd={
          hasPaidSubscription && subscription?.currentPeriodEnd
            ? new Date(subscription.currentPeriodEnd)
            : undefined
        }
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
  // Helper function to create gift subscription alert
  const createGiftAlert = (isActive: boolean) => {
    const alertType = isActive ? 'info' : 'warning'
    const icon = isActive ? (
      <GiftIcon size={18} className='text-indigo-400' />
    ) : (
      <CalendarIcon size={18} className='text-amber-400' />
    )
    const title = isActive ? 'Gift Subscription Active' : 'Free Pro Access Period'
    const textColor = isActive ? 'text-indigo-300' : 'text-amber-300'

    // Check if this is a virtual subscription created for the grace period
    const isVirtualSubscription =
      (subscription as unknown as SubscriptionWithGiftDetails)?.isVirtual ||
      (subscription as unknown as SubscriptionWithGiftDetails)?.isGracePeriodVirtual

    return (
      <Alert
        className={getAlertStyles(alertType)}
        message={<SubscriptionAlertMessage icon={icon} text={title} color={textColor} />}
        description={
          <div className={`mt-1 ${textColor}`}>
            {!isActive && <p>All users have free Pro access until {gracePeriodPrettyDate}.</p>}
            {(isActive || isGiftAfterGracePeriod()) && (
              <div>
                {/* Add timeline visualization */}
                {(isActive
                  ? latestGiftEndDate && (inGracePeriod || !isVirtualSubscription)
                  : true) && renderTimeline()}
              </div>
            )}
          </div>
        }
        type={alertType}
        showIcon={false}
      />
    )
  }

  const GiftSubtitle = createGiftAlert(false)
  const GiftSubtitleActive = createGiftAlert(true)

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
        GiftSubtitleActive
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
        GiftSubtitle
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
                  {/* Show post-paid gift info if applicable */}
                  {subscription?.metadata &&
                    typeof subscription.metadata === 'object' &&
                    (subscription.metadata as Record<string, unknown>).hasPostPaidGift === 'true' &&
                    subscription?.currentPeriodEnd && (
                      <p className='mt-1 text-xs text-indigo-400'>
                        Your gift subscription will be applied after your current paid period ends
                        on {new Date(subscription.currentPeriodEnd).toLocaleDateString()}.
                      </p>
                    )}
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
      {shouldShowGracePeriodAlert && GiftSubtitle}

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
                {/* Show post-paid gift info if applicable */}
                {subscription.metadata &&
                  typeof subscription.metadata === 'object' &&
                  (subscription.metadata as Record<string, unknown>).hasPostPaidGift === 'true' &&
                  subscription.currentPeriodEnd && (
                    <p className='mt-1 text-sm'>
                      Your gift subscription will be applied after your current paid period ends on{' '}
                      {new Date(subscription.currentPeriodEnd).toLocaleDateString()}.
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
