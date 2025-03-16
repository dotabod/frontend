import { useSubscriptionContext } from '@/contexts/SubscriptionContext'
import {
  isSubscriptionActive,
  gracePeriodPrettyDate,
  gracePeriodEndNextDay,
  GRACE_PERIOD_END,
} from '@/utils/subscription'
import { Button, Alert } from 'antd'
import { ExternalLinkIcon, GiftIcon, CalendarIcon, ClockIcon, CheckCircleIcon } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import type { GiftInfo, StatusInfo, GiftSubInfo } from './types'
import type { SubscriptionWithGiftDetails } from './types'

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

  // Determine if gift subscription will start after grace period
  const isGiftAfterGracePeriod = () => {
    // Only check if there are actual gift subscriptions
    if (!giftInfo.hasGifts || !giftInfo.proExpiration || !inGracePeriod) return false

    // Check if the gift expiration is after the grace period
    const gracePeriodEndDate = new Date(GRACE_PERIOD_END)
    return new Date(giftInfo.proExpiration) > gracePeriodEndDate
  }

  // Check if the user has an active gift subscription
  const hasActiveGiftSubscription =
    giftInfo.hasGifts && giftInfo.proExpiration && new Date(giftInfo.proExpiration) > new Date()

  // Get formatted expiration date for gift subscription
  const formattedGiftExpirationDate = giftInfo.proExpiration
    ? new Date(giftInfo.proExpiration).toLocaleDateString()
    : ''

  // Format time since gift was received
  const formatGiftTime = (date: Date) => {
    return formatDistanceToNow(new Date(date), { addSuffix: true })
  }

  // Check if this is a virtual subscription created for the grace period
  const isVirtualGracePeriodSubscription =
    (subscription as unknown as SubscriptionWithGiftDetails)?.isGracePeriodVirtual ||
    (inGracePeriod &&
      subscription?.status === 'TRIALING' &&
      !subscription?.stripeSubscriptionId &&
      subscription?.currentPeriodEnd &&
      new Date(subscription.currentPeriodEnd).getTime() === new Date(GRACE_PERIOD_END).getTime())

  // Determine if we should show the grace period alert
  // Only show if not a lifetime plan, in grace period, not a virtual grace period subscription,
  // and not showing the gift subscription alert that already mentions the grace period
  const shouldShowGracePeriodAlert =
    !isLifetimePlan &&
    inGracePeriod &&
    !isVirtualGracePeriodSubscription &&
    !hasActiveGiftSubscription

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
      {/* For lifetime gift subscriptions, show a single consolidated message */}
      {(isLifetimePlan || giftInfo.hasLifetime) && giftSubInfo?.isGift ? (
        <Alert
          className='max-w-2xl rounded-lg border-2 border-emerald-800 bg-emerald-950/60 shadow-sm'
          message={
            <div className='flex items-center gap-2 font-medium text-emerald-300'>
              <CheckCircleIcon size={18} className='text-emerald-400' />
              <span>Lifetime Access</span>
            </div>
          }
          description={
            <div className='mt-1 text-emerald-300'>
              <p>
                Someone gifted you lifetime access to Dotabod Pro. Enjoy all premium features
                forever!
              </p>
              {giftSubInfo.senderName && giftSubInfo.senderName !== 'Anonymous' && (
                <p className='mt-1 text-sm'>Gift from: {giftSubInfo.senderName}</p>
              )}
              {giftSubInfo.giftMessage && (
                <p className='mt-1 italic text-sm text-emerald-400'>"{giftSubInfo.giftMessage}"</p>
              )}
            </div>
          }
          type='success'
          showIcon={false}
        />
      ) : isLifetimePlan ? (
        /* For regular lifetime subscriptions */
        <Alert
          className='max-w-2xl rounded-lg border-2 border-emerald-800 bg-emerald-950/60 shadow-sm'
          message={
            <div className='flex items-center gap-2 font-medium text-emerald-300'>
              <CheckCircleIcon size={18} className='text-emerald-400' />
              <span>Lifetime Access</span>
            </div>
          }
          description='Thank you for being a lifetime supporter!'
          type='success'
          showIcon={false}
        />
      ) : hasActiveGiftSubscription ? (
        /* If user has an active gift subscription via proExpiration */
        <Alert
          className='max-w-2xl rounded-lg border-2 border-indigo-800 bg-indigo-950/60 shadow-sm'
          message={
            <div className='flex items-center gap-2 font-medium text-indigo-300'>
              <GiftIcon size={18} className='text-indigo-400' />
              <span>Gift Subscription Active</span>
            </div>
          }
          description={
            <div className='mt-1 text-indigo-300'>
              <p>
                {isGiftAfterGracePeriod()
                  ? `Your gift subscription will activate on ${gracePeriodEndNextDay}${giftInfo.proExpiration ? ` and will be active until ${formattedGiftExpirationDate}` : ''}`
                  : `Your gift subscription is active until ${formattedGiftExpirationDate}`}
              </p>
              {/* Add information about when they'll be charged */}
              {!isLifetimePlan && !hasActivePlan && (
                <p className='mt-1 text-sm font-medium'>
                  You will be charged for a subscription starting {formattedGiftExpirationDate}
                  unless you cancel before then.
                </p>
              )}
              {/* If they have an active plan, explain that gift takes priority */}
              {!isLifetimePlan && hasActivePlan && subscription?.currentPeriodEnd && (
                <p className='mt-1 text-sm font-medium'>
                  Your gift subscription will be used before your paid subscription. Your paid
                  subscription
                  {subscription.cancelAtPeriodEnd ? ' ends' : ' renews'} on{' '}
                  {new Date(subscription.currentPeriodEnd).toLocaleDateString()}.
                </p>
              )}
              {/* If in grace period, mention it here instead of showing a separate alert */}
              {inGracePeriod && (
                <p className='mt-2 text-sm'>
                  <span className='font-medium'>Note:</span> All users currently have free Pro
                  access until {gracePeriodPrettyDate}. Your paid subscription will begin on{' '}
                  {gracePeriodEndNextDay}.
                </p>
              )}
              {giftInfo.giftSubscriptions && giftInfo.giftSubscriptions.length > 0 && (
                <div className='mt-2 text-sm'>
                  <p className='font-medium'>Recent gifts:</p>
                  <ul className='mt-1 space-y-1'>
                    {giftInfo.giftSubscriptions.slice(0, 2).map((gift) => (
                      <li key={gift.id} className='flex items-start gap-2'>
                        <GiftIcon size={14} className='mt-1 shrink-0 text-indigo-400' />
                        <div>
                          <span className='font-medium'>{gift.senderName}</span>
                          {gift.giftType === 'monthly' && (
                            <span>
                              {' '}
                              gifted {gift.giftQuantity} month{gift.giftQuantity > 1 ? 's' : ''}
                            </span>
                          )}
                          {gift.giftType === 'annual' && (
                            <span>
                              {' '}
                              gifted {gift.giftQuantity} year{gift.giftQuantity > 1 ? 's' : ''}
                            </span>
                          )}
                          <span className='ml-1 text-xs text-indigo-400'>
                            {formatGiftTime(gift.createdAt)}
                          </span>
                        </div>
                      </li>
                    ))}
                  </ul>
                  {giftInfo.giftSubscriptions.length > 2 && (
                    <p className='mt-1 text-xs text-indigo-400'>
                      +{giftInfo.giftSubscriptions.length - 2} more gift
                      {giftInfo.giftSubscriptions.length - 2 > 1 ? 's' : ''}
                    </p>
                  )}
                </div>
              )}
            </div>
          }
          type='info'
          showIcon={false}
        />
      ) : subscription?.isGift ? (
        /* If the primary subscription is a gift, show only that alert */
        <Alert
          className='max-w-2xl rounded-lg border-2 border-indigo-800 bg-indigo-950/60 shadow-sm'
          message={
            <div className='flex items-center gap-2 font-medium text-indigo-300'>
              <GiftIcon size={18} className='text-indigo-400' />
              <span>{statusInfo?.message || 'Gift Subscription'}</span>
            </div>
          }
          description={
            <div className='mt-1 text-indigo-300'>
              {giftSubInfo?.message}
              {giftSubInfo?.senderName && giftSubInfo.senderName !== 'Anonymous' && (
                <p className='mt-1 text-sm'>Gift from: {giftSubInfo.senderName}</p>
              )}
              {giftSubInfo?.giftMessage && (
                <p className='mt-1 italic text-sm text-indigo-400'>"{giftSubInfo.giftMessage}"</p>
              )}
              {/* If in grace period, mention it here instead of showing a separate alert */}
              {inGracePeriod && (
                <p className='mt-2 text-sm'>
                  <span className='font-medium'>Note:</span> All users currently have free Pro
                  access until {gracePeriodPrettyDate}. Your paid subscription will begin on{' '}
                  {gracePeriodEndNextDay}.
                </p>
              )}
            </div>
          }
          type={statusInfo?.type || 'info'}
          showIcon={false}
        />
      ) : isVirtualGracePeriodSubscription ? (
        /* For virtual subscriptions created during grace period, only show the grace period alert */
        <Alert
          className='max-w-2xl rounded-lg border-2 border-amber-800 bg-amber-950/60 shadow-sm'
          message={
            <div className='flex items-center gap-2 font-medium text-amber-300'>
              <CalendarIcon size={18} className='text-amber-400' />
              <span>Free Pro Access Period</span>
            </div>
          }
          description={
            <div className='mt-1 text-amber-300'>
              <p>All users have free Pro access until {gracePeriodPrettyDate}.</p>
              {isGiftAfterGracePeriod() && (
                <div>
                  <p className='mt-1'>
                    Your gift subscription will automatically activate on {gracePeriodEndNextDay}
                    {giftInfo.proExpiration
                      ? ` and will be active until ${formattedGiftExpirationDate}`
                      : ''}
                    .
                  </p>
                  {!hasActivePlan && giftInfo.proExpiration && (
                    <p className='mt-1 font-medium'>
                      After your gift expires on {formattedGiftExpirationDate}, you will be charged
                      for a subscription unless you cancel before then.
                    </p>
                  )}
                </div>
              )}
            </div>
          }
          type='warning'
          showIcon={false}
        />
      ) : statusInfo?.message && !statusInfo.message.includes('Gift subscription') ? (
        <Alert
          className='max-w-2xl rounded-lg border-2 border-indigo-800 bg-indigo-950/60 shadow-sm'
          message={
            <div className='flex items-center gap-2 font-medium text-indigo-300'>
              {statusInfo.type === 'success' ? (
                <CheckCircleIcon size={18} className='text-emerald-400' />
              ) : (
                <ClockIcon size={18} className='text-indigo-400' />
              )}
              <span>{statusInfo.message}</span>
            </div>
          }
          description={
            <div className='mt-1 text-indigo-300'>
              {subscription?.currentPeriodEnd && (
                <p>
                  Your subscription will {subscription.cancelAtPeriodEnd ? 'end' : 'renew'} on{' '}
                  {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
                </p>
              )}

              {/* Show gift subscription info if user has both regular and gift subscriptions */}
              {giftInfo.hasGifts && giftInfo.proExpiration && (
                <div className='mt-2 border-t border-indigo-800/50 pt-2'>
                  <p className='flex items-center gap-1 text-sm'>
                    <GiftIcon size={14} className='text-indigo-400' />
                    <span className='font-medium'>Gift subscription active</span>
                  </p>
                  <p className='mt-1 text-sm'>
                    {giftInfo.proExpiration && new Date(giftInfo.proExpiration) > new Date()
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

              {/* If in grace period, mention it here instead of showing a separate alert */}
              {inGracePeriod && (
                <p className='mt-2 text-sm'>
                  <span className='font-medium'>Note:</span> All users currently have free Pro
                  access until {gracePeriodPrettyDate}. Your paid subscription will begin on{' '}
                  {gracePeriodEndNextDay}.
                </p>
              )}
            </div>
          }
          type={statusInfo.type}
          showIcon={false}
        />
      ) : null}

      {/* Only show grace period alert if not a lifetime plan, in grace period, not a virtual grace period subscription,
          and not showing the gift subscription alert that already mentions the grace period */}
      {shouldShowGracePeriodAlert && (
        <Alert
          className='max-w-2xl rounded-lg border-2 border-amber-800 bg-amber-950/60 shadow-sm'
          message={
            <div className='flex items-center gap-2 font-medium text-amber-300'>
              <CalendarIcon size={18} className='text-amber-400' />
              <span>Free Pro Access Period</span>
            </div>
          }
          description={
            <div className='mt-1 text-amber-300'>
              {hasActivePlan
                ? `All users have free Pro access until ${gracePeriodPrettyDate}, but you're already subscribed. Thank you for your support!`
                : `All users have free Pro access until ${gracePeriodPrettyDate}. Regular subscriptions will begin on ${gracePeriodEndNextDay}.`}
              {isGiftAfterGracePeriod() && (
                <div>
                  <p className='mt-1'>
                    Your gift subscription will automatically activate on {gracePeriodEndNextDay}
                    {giftInfo.proExpiration
                      ? ` and will be active until ${formattedGiftExpirationDate}`
                      : ''}
                    .
                  </p>
                  {!hasActivePlan && giftInfo.proExpiration && (
                    <p className='mt-1 font-medium'>
                      After your gift expires on {formattedGiftExpirationDate}, you will be charged
                      for a subscription unless you cancel before then.
                    </p>
                  )}
                  {hasActivePlan && subscription?.currentPeriodEnd && (
                    <p className='mt-1 font-medium'>
                      Your gift subscription will be used before your paid subscription. Your paid
                      subscription
                      {subscription.cancelAtPeriodEnd ? ' ends' : ' renews'} on{' '}
                      {new Date(subscription.currentPeriodEnd).toLocaleDateString()}.
                    </p>
                  )}
                </div>
              )}
            </div>
          }
          type='warning'
          showIcon={false}
        />
      )}

      {/* Show gift info for users with gift subscriptions, but only if their primary subscription isn't a gift
          and they don't have an active proExpiration (which would be shown in the main alert) */}
      {giftInfo.hasGifts && !subscription?.isGift && !giftInfo.proExpiration && (
        <Alert
          className='max-w-2xl rounded-lg border-2 border-indigo-800 bg-indigo-950/60 shadow-sm'
          message={
            <div className='flex items-center gap-2 font-medium text-indigo-300'>
              <GiftIcon size={18} className='text-indigo-400' />
              <span>Gift Subscriptions</span>
            </div>
          }
          description={giftInfo.giftMessage}
          type='info'
          showIcon={false}
        />
      )}

      {/* Show special alert for users with both subscription types, but only if we're not already showing
          detailed information about both in the main alerts */}
      {hasBothSubscriptionTypes &&
        subscription &&
        !giftInfo.proExpiration &&
        !(statusInfo?.message && giftInfo.hasGifts) && (
          <Alert
            message='You Have Multiple Subscriptions'
            description={
              <div>
                <p>You have both a regular subscription and gift subscription(s).</p>
                {giftInfo.proExpiration && subscription.currentPeriodEnd && (
                  <p>
                    Your gift subscription{giftInfo.giftCount > 1 ? 's' : ''} will extend your Pro
                    access
                    {subscription.cancelAtPeriodEnd
                      ? ` after your current subscription ends on ${new Date(subscription.currentPeriodEnd).toLocaleDateString()}.`
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
