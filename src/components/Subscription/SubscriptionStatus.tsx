import { useSubscriptionContext } from '@/contexts/SubscriptionContext'
import { fetchGiftSubscriptions } from '@/lib/gift-subscription'
import {
  getCurrentPeriod,
  getGiftSubscriptionInfo,
  getSubscriptionStatusInfo,
  gracePeriodPrettyDate,
  GRACE_PERIOD_END,
  type SUBSCRIPTION_TIERS,
} from '@/utils/subscription'
import { Alert } from 'antd'
import { useSession } from 'next-auth/react'
import { useEffect, useState } from 'react'
import { GiftIcon, CalendarIcon, ClockIcon, CheckCircleIcon } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import type { JsonValue } from '@prisma/client/runtime/library'
import type { SubscriptionStatus as SubStatus, TransactionType } from '@prisma/client'

interface SubscriptionStatusProps {
  showAlert?: boolean
}

// Define the subscription type with giftDetails
interface SubscriptionWithGiftDetails {
  id?: string
  userId?: string
  stripeCustomerId?: string | null
  stripePriceId?: string | null
  stripeSubscriptionId?: string | null
  tier?: (typeof SUBSCRIPTION_TIERS)[keyof typeof SUBSCRIPTION_TIERS]
  status?: SubStatus | null
  transactionType?: TransactionType | null
  currentPeriodEnd?: Date | null
  cancelAtPeriodEnd?: boolean
  isGift?: boolean
  metadata?: JsonValue
  giftDetails?: {
    senderName?: string | null
    giftType?: string | null
    giftQuantity?: number | null
    giftMessage?: string | null
  } | null
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
  const [giftInfo, setGiftInfo] = useState<{
    hasGifts: boolean
    giftCount: number
    giftMessage: string
    proExpiration: Date | null
    hasLifetime: boolean
    giftSubscriptions?: Array<{
      id: string
      endDate: Date | null
      senderName: string
      giftType: string
      giftQuantity: number
      giftMessage: string
      createdAt: Date
    }>
  }>({
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

  // Determine if gift subscription will start after grace period
  const isGiftAfterGracePeriod = () => {
    if (!giftInfo.proExpiration || !inGracePeriod) return false

    // Check if the gift expiration is after the grace period
    const gracePeriodEndDate = new Date(GRACE_PERIOD_END)
    return new Date(giftInfo.proExpiration) > gracePeriodEndDate
  }

  // Format time since gift was received
  const formatGiftTime = (date: Date) => {
    return formatDistanceToNow(new Date(date), { addSuffix: true })
  }

  return (
    <div className='flex flex-col gap-4'>
      {showAlert ? (
        <>
          {/* Primary subscription status alert - prioritize showing the most important information */}
          {/* For lifetime gift subscriptions, show a single consolidated message */}
          {(isLifetimePlan || giftInfo.hasLifetime) && giftSubInfo?.isGift ? (
            <Alert
              className='mt-6 max-w-2xl rounded-lg border-2 border-emerald-800 bg-emerald-950/60 shadow-sm'
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
                    <p className='mt-1 italic text-sm text-emerald-400'>
                      "{giftSubInfo.giftMessage}"
                    </p>
                  )}
                </div>
              }
              type='success'
              showIcon={false}
            />
          ) : isLifetimePlan ? (
            /* For regular lifetime subscriptions */
            <Alert
              className='mt-6 max-w-2xl rounded-lg border-2 border-emerald-800 bg-emerald-950/60 shadow-sm'
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
          ) : giftInfo.proExpiration && new Date(giftInfo.proExpiration) > new Date() ? (
            /* If user has an active gift subscription via proExpiration */
            <Alert
              className='mt-6 max-w-2xl rounded-lg border-2 border-indigo-800 bg-indigo-950/60 shadow-sm'
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
                      ? `Your gift subscription will activate after the free period ends (${gracePeriodPrettyDate})`
                      : `Your gift subscription is active until ${new Date(giftInfo.proExpiration).toLocaleDateString()}`}
                  </p>
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
              className='mt-6 max-w-2xl rounded-lg border-2 border-indigo-800 bg-indigo-950/60 shadow-sm'
              message={
                <div className='flex items-center gap-2 font-medium text-indigo-300'>
                  <GiftIcon size={18} className='text-indigo-400' />
                  <span>{statusInfo?.message || 'Gift Subscription'}</span>
                </div>
              }
              description={
                <div className='mt-1 text-indigo-300'>
                  {giftSubInfo.message}
                  {giftSubInfo.senderName && giftSubInfo.senderName !== 'Anonymous' && (
                    <p className='mt-1 text-sm'>Gift from: {giftSubInfo.senderName}</p>
                  )}
                  {giftSubInfo.giftMessage && (
                    <p className='mt-1 italic text-sm text-indigo-400'>
                      "{giftSubInfo.giftMessage}"
                    </p>
                  )}
                </div>
              }
              type={statusInfo?.type || 'info'}
              showIcon={false}
            />
          ) : statusInfo?.message && !statusInfo.message.includes('Gift subscription') ? (
            <Alert
              className='mt-6 max-w-2xl rounded-lg border-2 border-indigo-800 bg-indigo-950/60 shadow-sm'
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
                        {new Date() < new Date(giftInfo.proExpiration)
                          ? `You also have a gift subscription active until ${new Date(giftInfo.proExpiration).toLocaleDateString()}`
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
                </div>
              }
              type={statusInfo.type}
              showIcon={false}
            />
          ) : null}

          {/* Only show grace period alert if not a lifetime plan and in grace period */}
          {!isLifetimePlan && inGracePeriod && (
            <Alert
              className='mt-2 max-w-2xl rounded-lg border-2 border-amber-800 bg-amber-950/60 shadow-sm'
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
                    : `All users have free Pro access until ${gracePeriodPrettyDate}.`}
                  {isGiftAfterGracePeriod() && (
                    <p className='mt-1'>
                      Your gift subscription will automatically activate after this period ends.
                    </p>
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
              className='mt-2 max-w-2xl rounded-lg border-2 border-indigo-800 bg-indigo-950/60 shadow-sm'
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
        </>
      ) : (
        <div className='text-base font-medium text-gray-300'>{getSubtitle()}</div>
      )}
    </div>
  )
}

// Export with the original name for backward compatibility
export const SubscriptionStatus = SubscriptionStatusComponent
