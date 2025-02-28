import { useSubscriptionContext } from '@/contexts/SubscriptionContext'
import { Settings } from '@/lib/defaultSettings'
import { useUpdateSetting } from '@/lib/hooks/useUpdateSetting'
import { createCheckoutSession } from '@/lib/stripe'
import {
  calculateSavings,
  getPriceId,
  GRACE_PERIOD_END,
  gracePeriodPrettyDate,
  isInGracePeriod,
  isSubscriptionActive,
  type PricePeriod,
  SUBSCRIPTION_TIERS,
  type SubscriptionRow,
} from '@/utils/subscription'
import { SubscriptionStatus, SubscriptionTier, TransactionType } from '@prisma/client'
import { App, Button, notification, Tooltip } from 'antd'
import clsx from 'clsx'
import { Bitcoin, CheckIcon } from 'lucide-react'
import { signIn, useSession } from 'next-auth/react'
import Image from 'next/image'
import { useRouter } from 'next/router'
import { useEffect, useRef, useState } from 'react'
import { Logomark } from './Logo'

function Plan({
  name,
  tier,
  price,
  description,
  button,
  features,
  activePeriod,
  logo,
  logomarkClassName,
  featured = false,
  hasTrial = false,
}: {
  name: string
  tier: SubscriptionTier
  price: {
    monthly: string
    annual: string
    lifetime: string
  }
  logo: React.ReactNode
  description: string
  button: {
    label: string
    href: string
  }
  features: Array<React.ReactNode>
  activePeriod: PricePeriod
  logomarkClassName?: string
  featured?: boolean
  subscription?: SubscriptionRow | null
  hasTrial?: boolean
}) {
  const { message, modal } = App.useApp()
  const { data: session } = useSession()
  const [redirectingToCheckout, setRedirectingToCheckout] = useState(false)
  const savings = calculateSavings(price.monthly, price.annual)
  const { subscription, inGracePeriod, hasActivePlan, isLifetimePlan } = useSubscriptionContext()
  const router = useRouter()
  // Add ref to track if subscription process has started
  const subscriptionStarted = useRef(false)
  const {
    data: cryptoInterest,
    loading: loadingCryptoInterest,
    updateSetting: updateCryptoInterest,
  } = useUpdateSetting<{
    interested: boolean
    tier: SubscriptionTier
    transactionType: TransactionType
  }>(Settings.crypto_payment_interest)

  const isCurrentPlan =
    subscription?.tier === tier &&
    activePeriod ===
      (isLifetimePlan
        ? 'lifetime'
        : subscription?.stripePriceId === getPriceId(SUBSCRIPTION_TIERS.PRO, 'annual')
          ? 'annual'
          : 'monthly')

  // Update description display to show trial info
  const displayDescription = () => {
    if (
      hasTrial &&
      tier === SUBSCRIPTION_TIERS.PRO &&
      activePeriod !== 'lifetime' &&
      (!subscription || subscription.status !== SubscriptionStatus.ACTIVE)
    ) {
      const now = new Date()

      if (isInGracePeriod()) {
        // Calculate days until grace period ends
        const daysUntilEnd = Math.ceil(
          (GRACE_PERIOD_END.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
        )
        return (
          <>
            {description}
            <span className='block mt-1 text-purple-400'>
              Includes free trial until {gracePeriodPrettyDate} ({daysUntilEnd} days)
            </span>
          </>
        )
      }
      return (
        <>
          {description}
          <span className='block mt-1 text-purple-400'>Includes 14-day free trial</span>
        </>
      )
    }
    return description
  }

  // Update button text logic
  const getSimplifiedButtonText = () => {
    const isLifetimePeriod = activePeriod === 'lifetime'
    const isProTier = tier === SUBSCRIPTION_TIERS.PRO
    const isFreeTier = tier === SUBSCRIPTION_TIERS.FREE
    const isTrialing = subscription?.status === SubscriptionStatus.TRIALING
    const isActive = subscription?.status === SubscriptionStatus.ACTIVE

    // If user has a lifetime subscription
    if (isLifetimePlan && isCurrentPlan) {
      return 'You have lifetime access'
    }

    // If user has a paid subscription for this plan
    if (hasActivePlan && isCurrentPlan) {
      return 'Manage plan'
    }

    // Handle grace period for users without paid subscription
    if (inGracePeriod && isProTier && !hasActivePlan) {
      return isLifetimePeriod ? 'Get lifetime access' : 'Subscribe now'
    }

    if (isFreeTier) {
      return 'Get started'
    }

    if (isProTier && isLifetimePeriod && !isLifetimePlan) {
      return 'Upgrade to lifetime'
    }

    if (hasTrial && isTrialing && !hasActivePlan) {
      return 'Manage trial'
    }

    if (!subscription || !isActive) {
      if (isProTier && isLifetimePeriod) {
        return 'Get lifetime access'
      }

      if (isProTier && !isLifetimePeriod) {
        return 'Update your subscription'
      }
      return button.label
    }

    return 'Manage plan'
  }

  const buttonText = getSimplifiedButtonText()

  // Determine if button should be disabled
  const isButtonDisabled = () => {
    // Always enable Free tier button
    if (tier === SUBSCRIPTION_TIERS.FREE) return false

    // Disable if user already has lifetime access
    if (isLifetimePlan && isCurrentPlan) return true

    return false
  }

  const handleSubscribe = async () => {
    setRedirectingToCheckout(true)
    try {
      if (!session) {
        await signIn('twitch', {
          callbackUrl: `/dashboard/billing?plan=${tier}&period=${activePeriod}`,
        })
        return
      }

      // If free plan, redirect to dashboard
      if (tier === SUBSCRIPTION_TIERS.FREE) {
        window.location.href = '/dashboard'
        return
      }

      // Special case for upgrading to lifetime
      if (
        subscription?.stripePriceId &&
        !isLifetimePlan &&
        tier === SUBSCRIPTION_TIERS.PRO &&
        activePeriod === 'lifetime' &&
        isSubscriptionActive({ status: subscription?.status })
      ) {
        // Show confirmation modal before proceeding
        modal.confirm({
          title: 'Upgrade to Lifetime Access',
          content: (
            <div className='space-y-2 mt-2'>
              <p>You currently have an active subscription. Here's what will happen:</p>
              <ul className='list-disc pl-4 space-y-1'>
                <li>You'll be charged once for lifetime access</li>
                <li>Your current subscription will be automatically canceled</li>
                <li>Your access to Pro features will continue uninterrupted</li>
                <li>You won't be charged any recurring fees in the future</li>
              </ul>
              <p className='mt-4'>Would you like to proceed with the upgrade?</p>
            </div>
          ),
          okText: 'Upgrade to Lifetime',
          cancelText: 'Cancel',
          onOk: async () => {
            // Create new checkout session for lifetime upgrade
            const priceId = getPriceId(SUBSCRIPTION_TIERS.PRO, 'lifetime')
            const response = await createCheckoutSession(priceId, session.user.id)

            if (!response.url) {
              throw new Error('Failed to create checkout session')
            }

            window.location.href = response.url
          },
          className: 'text-base',
          width: 500,
        })
        setRedirectingToCheckout(false)
        return
      }

      // If user has an active paid subscription, redirect to portal
      if (
        isSubscriptionActive({ status: subscription?.status }) &&
        subscription?.stripeSubscriptionId
      ) {
        const response = await fetch('/api/stripe/portal', {
          method: 'POST',
        })

        if (!response.ok) {
          throw new Error('Failed to create portal session')
        }

        const { url } = await response.json()
        window.location.href = url
        return
      }

      // For new subscriptions, create checkout session
      const priceId = getPriceId(
        tier as Exclude<SubscriptionTier, typeof SUBSCRIPTION_TIERS.FREE>,
        activePeriod,
      )
      const response = await createCheckoutSession(priceId, session.user.id)

      if (!response.url) {
        throw new Error('Failed to create checkout session')
      }

      window.location.href = response.url
    } catch (error) {
      console.error('Subscription error:', error)
      notification.error({
        message: 'Subscription Error',
        description: 'Failed to process subscription request. Please try again later.',
        placement: 'bottomRight',
      })
    } finally {
      setRedirectingToCheckout(false)
    }
  }

  // Function to handle crypto interest vote
  const handleCryptoInterest = async () => {
    if (!session) {
      message.info('Please sign in to register your interest in crypto payments')
      return
    }

    try {
      updateCryptoInterest({
        interested: true,
        tier: tier,
        transactionType: activePeriod === 'lifetime' ? TransactionType.LIFETIME : TransactionType.RECURRING,
      })
    } catch (error) {
      console.error('Error registering crypto interest:', error)
      notification.error({
        message: 'Error',
        description: 'Failed to register your interest. Please try again later.',
      })
    }
  }

  // Add effect to handle auto-subscription based on URL parameters
  useEffect(() => {
    const { plan, period } = router.query

    // Check if URL parameters match this plan's tier and period
    if (
      session &&
      plan === tier &&
      period === activePeriod &&
      !redirectingToCheckout &&
      !subscriptionStarted.current
    ) {
      // Mark that we've started the subscription process
      subscriptionStarted.current = true

      // Remove the query parameters to prevent repeated subscription attempts
      const { pathname } = router
      router.replace(pathname, undefined, { shallow: true })
      message.success('Redirecting to checkout...')

      // Trigger subscription process
      handleSubscribe()
    }
  }, [router.query, session, tier, activePeriod, redirectingToCheckout]);

  return (
    <section
      className={clsx(
        'flex flex-col overflow-hidden rounded-3xl p-6 shadow-lg shadow-gray-900/5',
        featured
          ? 'order-first bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 ring-2 ring-purple-500 lg:order-none'
          : 'bg-gray-800/50 backdrop-blur-xl',
      )}
    >
      <h3
        className={clsx(
          'flex items-center text-sm font-semibold',
          featured ? 'text-purple-400' : 'text-gray-100',
        )}
      >
        {logo ? (
          activePeriod === 'lifetime' && tier === SUBSCRIPTION_TIERS.PRO ? (
            <Image
              src='https://cdn.betterttv.net/emote/609431bc39b5010444d0cbdc/3x.webp'
              width={24}
              height={24}
              alt='Lifetime'
              className='rounded'
            />
          ) : (
            logo
          )
        ) : (
          <Logomark className={clsx('h-6 w-6 flex-none', logomarkClassName)} />
        )}
        <span className='ml-4'>{name}</span>
        {inGracePeriod &&
          tier === SUBSCRIPTION_TIERS.PRO &&
          !hasActivePlan &&
          activePeriod !== 'lifetime' && (
            <span className='ml-2 text-xs px-2 py-0.5 bg-purple-500/20 text-purple-300 rounded-full'>
              Free until {gracePeriodPrettyDate}
            </span>
          )}
        {hasActivePlan && isCurrentPlan && (
          <span className='ml-2 text-xs px-2 py-0.5 bg-green-500/20 text-green-300 rounded-full'>
            Your plan
          </span>
        )}
      </h3>
      <p
        className={clsx(
          'relative mt-5 flex text-4xl font-bold tracking-tight',
          featured ? 'text-white' : 'text-gray-100',
        )}
      >
        {price.monthly === price.annual ? (
          price.monthly
        ) : (
          <>
            <span
              aria-hidden={activePeriod === 'annual' || activePeriod === 'lifetime'}
              className={clsx(
                'transition duration-300',
                (activePeriod === 'annual' || activePeriod === 'lifetime') &&
                  'pointer-events-none translate-x-6 opacity-0 select-none',
              )}
            >
              {price.monthly}
              <span className='text-sm'> / month</span>
            </span>
            <span
              aria-hidden={activePeriod !== 'annual'}
              className={clsx(
                'absolute top-0 left-0 transition duration-300',
                activePeriod === 'annual'
                  ? 'translate-x-0 opacity-100'
                  : 'pointer-events-none -translate-x-6 opacity-0 select-none',
              )}
            >
              {price.annual}
              <span className='text-sm'> / year</span>
            </span>
            <span
              aria-hidden={activePeriod !== 'lifetime'}
              className={clsx(
                'absolute top-0 left-0 transition duration-300',
                activePeriod === 'lifetime'
                  ? 'translate-x-0 opacity-100'
                  : 'pointer-events-none -translate-x-6 opacity-0 select-none',
              )}
            >
              {price.lifetime}
              <span className='text-sm'> one-time</span>
            </span>
          </>
        )}
      </p>
      {activePeriod === 'annual' && !Number.isNaN(savings) && (
        <p className={clsx('-mt-10 text-sm', featured ? 'text-purple-200' : 'text-gray-400')}>
          Saving {savings}%
        </p>
      )}
      <p className={clsx('mt-3 text-sm', featured ? 'text-purple-200' : 'text-gray-400')}>
        {displayDescription()}
      </p>
      <div className='order-last mt-6'>
        <ol
          className={clsx(
            '-my-2 divide-y text-sm',
            featured ? 'divide-gray-700/50 text-gray-300' : 'divide-gray-700/30 text-gray-300',
          )}
        >
          {features.map((feature, index) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: <explanation>
            <li key={index} className='flex py-2'>
              <CheckIcon
                className={clsx(
                  'h-6 w-6 flex-none',
                  featured ? 'text-purple-400' : 'text-purple-500',
                )}
              />
              <span className='ml-4'>{feature}</span>
            </li>
          ))}
        </ol>
      </div>

      <Button
        loading={redirectingToCheckout}
        onClick={handleSubscribe}
        disabled={isButtonDisabled()}
        size={featured ? 'large' : 'middle'}
        color={featured ? 'danger' : 'default'}
        className={clsx(
          'mt-6',
          featured
            ? 'bg-purple-500 hover:bg-purple-400 text-gray-900 font-semibold'
            : 'bg-gray-700 hover:bg-gray-600 text-gray-100',
        )}
        aria-label={`Get started with the ${name} plan for ${price[activePeriod]}`}
      >
        {buttonText}
      </Button>

      {/* Crypto interest button */}
      {tier !== SUBSCRIPTION_TIERS.FREE && (
        <div className="mt-3 text-center">
          <Tooltip title={cryptoInterest?.interested ? "We'll add crypto payments if enough people want it. Check back soon!" : "Let us know if you'd like to pay with cryptocurrency"}>
            <Button
              type="link"
              size="small"
              icon={<Bitcoin size={16} />}
              onClick={handleCryptoInterest}
              loading={loadingCryptoInterest}
              disabled={cryptoInterest?.interested}
              className={clsx(
                'text-xs',
                featured ? 'text-purple-300 hover:text-purple-200' : 'text-gray-400 hover:text-gray-300'
              )}
            >
              {cryptoInterest?.interested ? 'Thanks for your interest in crypto payments!' : 'Interested in paying with crypto?'}
            </Button>
          </Tooltip>
        </div>
      )}
    </section>
  )
}

export default Plan
