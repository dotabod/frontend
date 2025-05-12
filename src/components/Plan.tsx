import { useSubscriptionContext } from '@/contexts/SubscriptionContext'
import { isFeatureEnabled } from '@/lib/featureFlags'
import { createCheckoutSession } from '@/lib/stripe'
import {
  type PricePeriod,
  SUBSCRIPTION_TIERS,
  type SubscriptionRow,
  calculateSavings,
  getPriceId,
  gracePeriodPrettyDate,
  isSubscriptionActive,
} from '@/utils/subscription'
import { SubscriptionStatus, TransactionType, type SubscriptionTier } from '@prisma/client'
import { App, Button, Tooltip, notification } from 'antd'
import clsx from 'clsx'
import { Bitcoin, CheckIcon, Wallet } from 'lucide-react'
import { signIn, useSession } from 'next-auth/react'
import Image from 'next/image'
import { useRouter } from 'next/router'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import CryptoToggle from './CryptoToggle'
import ErrorBoundary from './ErrorBoundary'
import { Logomark } from './Logo'
import { PlanDescription } from './PlanDescription'
import { Settings } from '@/lib/defaultSettings'
import { useUpdateSetting } from '@/lib/hooks/useUpdateSetting'
import { fetcher } from '@/lib/fetcher'
import useSWR from 'swr'

// Sparkle animation component with unique IDs
const CryptoSparkle = ({ visible }: { visible: boolean }) => {
  // Create a fixed array of sparkles with pre-determined keys
  // This prevents the random key generation on each render that could cause issues
  const sparkles = useMemo(() => {
    return Array.from({ length: 8 }).map((_, index) => ({
      id: `sparkle-${index}`,
      top: `${Math.random() * 100}%`,
      left: `${Math.random() * 100}%`,
      width: `${Math.random() * 5 + 2}px`,
      height: `${Math.random() * 5 + 2}px`,
      delay: `${Math.random() * 1.5}s`,
      duration: `${Math.random() * 1 + 1.5}s`,
    }))
  }, []) // Empty dependency array means this only runs once

  if (!visible) return null

  return (
    <div className='absolute inset-0 pointer-events-none overflow-hidden'>
      <div className='absolute top-0 left-0 w-full h-full'>
        {sparkles.map((sparkle) => (
          <span
            key={sparkle.id}
            className='absolute block rounded-full bg-purple-400 opacity-0 animate-sparkle'
            style={{
              top: sparkle.top,
              left: sparkle.left,
              width: sparkle.width,
              height: sparkle.height,
              animationDelay: sparkle.delay,
              animationDuration: sparkle.duration,
            }}
          />
        ))}
      </div>
    </div>
  )
}

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
  const {
    data: cryptoInterest,
    loading: loadingCryptoInterest,
    updateSetting: updateCryptoInterest,
  } = useUpdateSetting<{
    interested: boolean
    tier: SubscriptionTier
    transactionType: TransactionType
  }>(Settings.crypto_payment_interest)
  const { data: cryptoInterestData, mutate: mutateCryptoInterestData } = useSWR(
    '/api/get-total-crypto-interest',
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      revalidateIfStale: false,
    },
  )

  const { message, modal } = App.useApp()
  const { data: session } = useSession()
  const [redirectingToCheckout, setRedirectingToCheckout] = useState(false)
  const {
    subscription,
    inGracePeriod,
    hasActivePlan,
    isLifetimePlan,
    creditBalance,
    formattedCreditBalance,
  } = useSubscriptionContext()

  // Check if the current subscription was paid with crypto by comparing price IDs
  const isPaidWithCrypto = useMemo(() => {
    // Only check for crypto payments on Pro tier subscriptions
    if (!subscription?.stripePriceId || tier === SUBSCRIPTION_TIERS.FREE) return false

    // Check if the subscription's price ID matches one with crypto payment
    const monthlyPriceWithCrypto = getPriceId(SUBSCRIPTION_TIERS.PRO, 'monthly', true)
    const annualPriceWithCrypto = getPriceId(SUBSCRIPTION_TIERS.PRO, 'annual', true)
    const lifetimePriceWithCrypto = getPriceId(SUBSCRIPTION_TIERS.PRO, 'lifetime', true)

    return [monthlyPriceWithCrypto, annualPriceWithCrypto, lifetimePriceWithCrypto].includes(
      subscription.stripePriceId,
    )
  }, [subscription?.stripePriceId, tier])

  // Check if crypto payments feature is enabled
  const isCryptoPaymentsEnabled = isFeatureEnabled('enableCryptoPayments')

  // Initialize payWithCrypto state based on subscription data and feature flag
  // Only enable for Pro tier and default to true if user already has a crypto subscription AND feature is enabled
  const [payWithCrypto, setPayWithCrypto] = useState(() => {
    return isCryptoPaymentsEnabled && tier === SUBSCRIPTION_TIERS.PRO && isPaidWithCrypto
  })

  // Update payWithCrypto when subscription data changes or feature flag status changes
  useEffect(() => {
    if (isCryptoPaymentsEnabled && tier === SUBSCRIPTION_TIERS.PRO && isPaidWithCrypto) {
      setPayWithCrypto(true)
    } else if (!isCryptoPaymentsEnabled) {
      // Ensure crypto payment is disabled when feature is disabled
      setPayWithCrypto(false)
    }
  }, [tier, isPaidWithCrypto, isCryptoPaymentsEnabled])

  const savings = calculateSavings(price.monthly, price.annual)

  const router = useRouter()
  // Add ref to track if subscription process has started
  const subscriptionStarted = useRef(false)

  // Determine if the crypto payment setting matches the current subscription's payment method
  const paymentMethodMatches = payWithCrypto === isPaidWithCrypto

  // Check if this is the current plan taking into account both period and payment method
  const isCurrentPlan =
    subscription?.tier === tier &&
    paymentMethodMatches && // Add check for payment method matching
    activePeriod ===
      (isLifetimePlan
        ? 'lifetime'
        : subscription?.stripePriceId ===
            getPriceId(SUBSCRIPTION_TIERS.PRO, 'annual', payWithCrypto)
          ? 'annual'
          : 'monthly')

  // Check if user has credit balance
  const hasCreditBalance = creditBalance > 0

  // Function to handle crypto interest vote
  const handleCryptoInterest = async () => {
    if (!session) {
      message.info('Please sign in to register your interest in crypto payments')
      return
    }

    try {
      // Call the update function without chaining .then()
      updateCryptoInterest({
        interested: true,
        tier: tier,
        transactionType:
          activePeriod === 'lifetime' ? TransactionType.LIFETIME : TransactionType.RECURRING,
      })

      // Optimistically update the UI
      if (cryptoInterestData) {
        mutateCryptoInterestData(
          {
            ...cryptoInterestData,
            userCount: cryptoInterestData.userCount + 1,
          },
          false,
        )
      }
    } catch (error) {
      console.error('Error registering crypto interest:', error)
      notification.error({
        message: 'Error',
        description: 'Failed to register your interest. Please try again later.',
      })
    }
  }

  // Update button text logic
  const getSimplifiedButtonText = () => {
    const isLifetimePeriod = activePeriod === 'lifetime'
    const isProTier = tier === SUBSCRIPTION_TIERS.PRO
    const isFreeTier = tier === SUBSCRIPTION_TIERS.FREE

    // If user has a lifetime subscription
    if (isLifetimePlan && !isFreeTier) {
      return 'You have lifetime access'
    }

    // If user has a paid subscription for this plan
    if (hasActivePlan && isCurrentPlan) {
      // For crypto payments, offer to pay the next invoice early
      if (isPaidWithCrypto && payWithCrypto) {
        return 'Pay next invoice early'
      }
      return 'Manage plan'
    }

    // For users with active crypto subscriptions but viewing different periods
    if (hasActivePlan && isPaidWithCrypto && payWithCrypto && isProTier) {
      if (isLifetimePeriod) {
        return 'Upgrade to lifetime'
      }

      // Determine if switching between monthly and annual
      const currentIsPeriod =
        subscription?.stripePriceId === getPriceId(SUBSCRIPTION_TIERS.PRO, 'monthly', true)
          ? 'monthly'
          : 'annual'

      if (currentIsPeriod !== activePeriod) {
        return `Switch to ${activePeriod} plan`
      }
    }

    // Case: User is switching from traditional finance to crypto
    if (hasActivePlan && !isPaidWithCrypto && payWithCrypto && isProTier) {
      if (isLifetimePeriod) {
        return 'Get lifetime access with crypto'
      }

      // Get the current period
      const currentRegularPeriod =
        subscription?.stripePriceId === getPriceId(SUBSCRIPTION_TIERS.PRO, 'monthly', false)
          ? 'monthly'
          : subscription?.stripePriceId === getPriceId(SUBSCRIPTION_TIERS.PRO, 'annual', false)
            ? 'annual'
            : 'unknown'

      if (currentRegularPeriod === activePeriod) {
        return 'Switch to crypto payments'
      }

      return `Switch to crypto ${activePeriod} plan`
    }

    // Case: User is switching from crypto to traditional finance
    if (hasActivePlan && isPaidWithCrypto && !payWithCrypto && isProTier) {
      if (isLifetimePeriod) {
        return 'Get lifetime access'
      }

      // Get the current period
      const currentCryptoPeriod =
        subscription?.stripePriceId === getPriceId(SUBSCRIPTION_TIERS.PRO, 'monthly', true)
          ? 'monthly'
          : subscription?.stripePriceId === getPriceId(SUBSCRIPTION_TIERS.PRO, 'annual', true)
            ? 'annual'
            : 'unknown'

      if (currentCryptoPeriod === activePeriod) {
        return 'Switch to regular payments'
      }

      return `Switch to regular ${activePeriod} plan`
    }

    // If crypto is selected, reflect that in the button text
    if (payWithCrypto && isProTier) {
      return isLifetimePeriod ? 'Get lifetime access with crypto' : 'Subscribe with crypto'
    }

    // If user has credit balance available
    if (hasCreditBalance && isProTier && !hasActivePlan && isLifetimePeriod) {
      return `Subscribe (${formattedCreditBalance} credit applied)`
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

    if (!subscription || subscription.status !== SubscriptionStatus.ACTIVE) {
      if (isProTier && isLifetimePeriod) {
        return 'Get lifetime access'
      }

      if (isProTier && !isLifetimePeriod && subscription?.tier === SUBSCRIPTION_TIERS.PRO) {
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
    if (isLifetimePlan) return true

    return false
  }

  const handleSubscribe = useCallback(
    async (overrideCryptoPreference?: boolean) => {
      if (redirectingToCheckout) return // Prevent multiple calls while redirecting
      setRedirectingToCheckout(true)

      // Use the override value if provided, otherwise use the state value
      const usePayWithCrypto =
        overrideCryptoPreference !== undefined ? overrideCryptoPreference : payWithCrypto

      try {
        if (!session) {
          await signIn('twitch', {
            callbackUrl: `/dashboard/billing?plan=${tier}&period=${activePeriod}${usePayWithCrypto ? '&crypto=true' : ''}`,
          })
          return
        }

        // If free plan, redirect to dashboard
        if (tier === SUBSCRIPTION_TIERS.FREE) {
          window.location.href = '/dashboard'
          return
        }

        // Handle crypto payment scenarios
        if (isPaidWithCrypto && usePayWithCrypto && hasActivePlan) {
          // Case 1: Pay next invoice early (same period)
          if (isCurrentPlan) {
            // Redirect to the next invoice payment page
            const response = await fetch('/api/stripe/crypto-invoice', {
              method: 'POST',
            })

            if (!response.ok) {
              throw new Error('Failed to fetch invoice information')
            }

            const { url } = await response.json()
            window.location.href = url
            return
          }

          // Case 2: Upgrade from monthly to annual or vice versa
          const currentIsPeriod =
            subscription?.stripePriceId === getPriceId(SUBSCRIPTION_TIERS.PRO, 'monthly', true)
              ? 'monthly'
              : 'annual'

          if (currentIsPeriod !== activePeriod && activePeriod !== 'lifetime') {
            modal.confirm({
              title: `Upgrade to ${activePeriod.charAt(0).toUpperCase() + activePeriod.slice(1)} Plan`,
              content: (
                <div className='space-y-2 mt-2'>
                  <p>
                    You currently have an active {currentIsPeriod} subscription. Here's what will
                    happen:
                  </p>
                  <ul className='list-disc pl-4 space-y-1'>
                    <li>You'll be charged for a new {activePeriod} subscription</li>
                    <li>Once payment is complete, your subscription will be extended</li>
                    <li>Your access to Pro features will continue uninterrupted</li>
                    <li className='text-amber-400'>
                      Any pending invoice for your current plan will be automatically canceled
                    </li>
                  </ul>
                  <p className='mt-4'>Would you like to proceed with the upgrade?</p>
                </div>
              ),
              okText: `Upgrade to ${activePeriod.charAt(0).toUpperCase() + activePeriod.slice(1)}`,
              cancelText: 'Cancel',
              onOk: async () => {
                try {
                  const priceId = getPriceId(SUBSCRIPTION_TIERS.PRO, activePeriod, true)
                  const response = await createCheckoutSession(priceId, session.user.id, 'crypto')

                  if (!response.url) {
                    throw new Error('Failed to create checkout session')
                  }

                  window.location.href = response.url
                } catch (error) {
                  console.error('Checkout session creation error:', error)
                  notification.error({
                    message: 'Checkout Error',
                    description: 'Failed to create checkout session. Please try again later.',
                    placement: 'bottomRight',
                  })
                }
              },
              className: 'text-base',
              width: 500,
            })
            setRedirectingToCheckout(false)
            return
          }
        }

        // Case 3: User has a traditional payment subscription but wants to switch to crypto
        // AND change from monthly to annual or vice versa
        if (
          hasActivePlan &&
          !isPaidWithCrypto &&
          usePayWithCrypto &&
          tier === SUBSCRIPTION_TIERS.PRO &&
          activePeriod !== 'lifetime'
        ) {
          // Determine current period from regular subscription
          const currentRegularPeriod =
            subscription?.stripePriceId === getPriceId(SUBSCRIPTION_TIERS.PRO, 'monthly', false)
              ? 'monthly'
              : subscription?.stripePriceId === getPriceId(SUBSCRIPTION_TIERS.PRO, 'annual', false)
                ? 'annual'
                : 'unknown'

          if (currentRegularPeriod !== activePeriod && currentRegularPeriod !== 'unknown') {
            modal.confirm({
              title: `Switch to Crypto ${activePeriod.charAt(0).toUpperCase() + activePeriod.slice(1)} Plan`,
              content: (
                <div className='space-y-2 mt-2'>
                  <p>
                    You're switching from a regular {currentRegularPeriod} plan to a crypto{' '}
                    {activePeriod} plan. Here's what will happen:
                  </p>
                  <ul className='list-disc pl-4 space-y-1'>
                    <li>You'll be charged for a new crypto-based {activePeriod} subscription</li>
                    <li>Your current regular subscription will be canceled</li>
                    <li>Future payments will be made with cryptocurrency (USDC)</li>
                    <li>Your access to Pro features will continue uninterrupted</li>
                    <li className='text-amber-400'>
                      Crypto subscriptions do not auto-renew - you'll receive an invoice to pay
                      manually
                    </li>
                  </ul>
                  <p className='mt-4'>Would you like to proceed with this change?</p>
                </div>
              ),
              okText: `Switch to Crypto ${activePeriod.charAt(0).toUpperCase() + activePeriod.slice(1)}`,
              cancelText: 'Cancel',
              onOk: async () => {
                try {
                  // Get the correct price ID for crypto payment
                  const priceId = getPriceId(SUBSCRIPTION_TIERS.PRO, activePeriod, true)

                  // Set the previous subscription ID in the metadata
                  const response = await createCheckoutSession(priceId, session.user.id, 'crypto')

                  if (!response.url) {
                    throw new Error('Failed to create checkout session')
                  }

                  window.location.href = response.url
                } catch (error) {
                  console.error('Checkout session creation error:', error)
                  notification.error({
                    message: 'Checkout Error',
                    description: 'Failed to create checkout session. Please try again later.',
                    placement: 'bottomRight',
                  })
                }
              },
              className: 'text-base',
              width: 550,
            })
            setRedirectingToCheckout(false)
            return
          }
        }

        // Case 4: User has a crypto subscription but wants to switch to traditional finance
        if (
          hasActivePlan &&
          isPaidWithCrypto &&
          !usePayWithCrypto &&
          tier === SUBSCRIPTION_TIERS.PRO &&
          activePeriod !== 'lifetime'
        ) {
          // Determine current period from crypto subscription
          const currentCryptoPeriod =
            subscription?.stripePriceId === getPriceId(SUBSCRIPTION_TIERS.PRO, 'monthly', true)
              ? 'monthly'
              : subscription?.stripePriceId === getPriceId(SUBSCRIPTION_TIERS.PRO, 'annual', true)
                ? 'annual'
                : 'unknown'

          modal.confirm({
            title: `Switch to Regular ${activePeriod.charAt(0).toUpperCase() + activePeriod.slice(1)} Plan`,
            content: (
              <div className='space-y-2 mt-2'>
                <p>
                  You're switching from a crypto {currentCryptoPeriod} plan to a regular{' '}
                  {activePeriod} plan. Here's what will happen:
                </p>
                <ul className='list-disc pl-4 space-y-1'>
                  <li>You'll be charged for a new subscription with your payment card</li>
                  <li>Your current crypto subscription will remain active until its end date</li>
                  <li>Any pending crypto invoices will be automatically canceled</li>
                  <li>Future payments will be automatically charged to your card</li>
                  <li className='text-green-400'>
                    Your subscription will auto-renew - no need to manually pay invoices
                  </li>
                </ul>
                <p className='mt-4'>Would you like to proceed with this change?</p>
              </div>
            ),
            okText: `Switch to Regular ${activePeriod.charAt(0).toUpperCase() + activePeriod.slice(1)}`,
            cancelText: 'Cancel',
            onOk: async () => {
              try {
                // Get the correct price ID for regular payment
                const priceId = getPriceId(SUBSCRIPTION_TIERS.PRO, activePeriod, false)

                // Create checkout session for regular payment
                const response = await createCheckoutSession(priceId, session.user.id)

                if (!response.url) {
                  throw new Error('Failed to create checkout session')
                }

                window.location.href = response.url
              } catch (error) {
                console.error('Checkout session creation error:', error)
                notification.error({
                  message: 'Checkout Error',
                  description: 'Failed to create checkout session. Please try again later.',
                  placement: 'bottomRight',
                })
              }
            },
            className: 'text-base',
            width: 550,
          })
          setRedirectingToCheckout(false)
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
                  {isPaidWithCrypto && usePayWithCrypto && (
                    <li className='text-amber-400'>
                      Any pending invoice for your current plan will be automatically canceled
                    </li>
                  )}
                </ul>
                <p className='mt-4'>Would you like to proceed with the upgrade?</p>
              </div>
            ),
            okText: 'Upgrade to Lifetime',
            cancelText: 'Cancel',
            onOk: async () => {
              try {
                // Create new checkout session for lifetime upgrade
                const priceId = getPriceId(SUBSCRIPTION_TIERS.PRO, 'lifetime', usePayWithCrypto)
                const response = await createCheckoutSession(
                  priceId,
                  session.user.id,
                  usePayWithCrypto ? 'crypto' : undefined,
                )

                if (!response.url) {
                  throw new Error('Failed to create checkout session')
                }

                window.location.href = response.url
              } catch (error) {
                console.error('Checkout session creation error:', error)
                notification.error({
                  message: 'Checkout Error',
                  description: 'Failed to create checkout session. Please try again later.',
                  placement: 'bottomRight',
                })
                setRedirectingToCheckout(false)
              }
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
          usePayWithCrypto,
        )
        const response = await createCheckoutSession(
          priceId,
          session.user.id,
          usePayWithCrypto ? 'crypto' : undefined,
        )

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
        setRedirectingToCheckout(false) // Reset redirecting state on error
      }
    },
    [
      session,
      tier,
      activePeriod,
      subscription,
      isLifetimePlan,
      modal,
      payWithCrypto,
      hasActivePlan,
      isCurrentPlan,
      isPaidWithCrypto,
      redirectingToCheckout,
    ],
  )

  // Add effect to handle auto-subscription based on URL parameters
  useEffect(() => {
    const { plan, period, crypto } = router.query

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

      // Trigger subscription process with crypto preference from URL
      handleSubscribe(crypto === 'true')
    }
  }, [router, session, tier, activePeriod, redirectingToCheckout, message, handleSubscribe])

  return (
    <ErrorBoundary>
      <section
        className={clsx(
          'flex flex-col overflow-hidden rounded-3xl p-6 shadow-lg shadow-gray-900/5 relative',
          featured
            ? 'order-first bg-linear-to-br from-gray-900 via-gray-800 to-gray-900 ring-2 ring-purple-500 lg:order-none'
            : 'bg-gray-800/50 backdrop-blur-xl',
          payWithCrypto && 'crypto-active transition-all duration-500',
        )}
      >
        {/* Crypto background effect when crypto is toggled on */}
        <div
          className={clsx(
            'absolute inset-0 transition-opacity duration-500 opacity-0 pointer-events-none',
            payWithCrypto && 'crypto-active-bg',
          )}
        />

        {/* Crypto sparkle animation */}
        <CryptoSparkle visible={payWithCrypto} />

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
                className='rounded-sm'
              />
            ) : (
              logo
            )
          ) : (
            <Logomark className={clsx('h-6 w-6 flex-none', logomarkClassName)} />
          )}
          <span className={clsx('ml-4', payWithCrypto && 'animate-pulse-soft')}>{name}</span>
          {inGracePeriod &&
            !payWithCrypto &&
            tier === SUBSCRIPTION_TIERS.PRO &&
            !hasActivePlan &&
            activePeriod !== 'lifetime' && (
              <span className='ml-2 text-xs px-2 py-0.5 bg-purple-500/20 text-purple-300 rounded-full transition-opacity duration-300'>
                Free until {gracePeriodPrettyDate}
              </span>
            )}
          {hasActivePlan && isCurrentPlan && (
            <span
              className={clsx(
                'ml-2 text-xs px-2 py-0.5 rounded-full transition-all duration-300',
                payWithCrypto
                  ? 'bg-gradient-to-r from-purple-500/30 to-amber-500/30 text-amber-300 border border-amber-500/40'
                  : 'bg-green-500/20 text-green-300',
              )}
            >
              {payWithCrypto ? '⚡ Your plan' : 'Your plan'}
            </span>
          )}
          {hasCreditBalance && tier === SUBSCRIPTION_TIERS.PRO && activePeriod !== 'lifetime' && (
            <span className='ml-2 text-xs px-2 py-0.5 bg-blue-500/20 text-blue-300 rounded-full flex items-center gap-1'>
              <Wallet size={12} />
              Credit: {formattedCreditBalance}
            </span>
          )}
        </h3>

        {/* Price display with transitions */}
        <div className='relative mt-5'>
          <p
            className={clsx(
              'flex text-4xl font-bold tracking-tight',
              featured ? 'text-white' : 'text-gray-100',
              payWithCrypto && 'crypto-price',
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
        </div>

        {activePeriod === 'annual' && !Number.isNaN(savings) && (
          <p className={clsx('-mt-10 text-sm', featured ? 'text-purple-200' : 'text-gray-400')}>
            Saving {savings}%
          </p>
        )}
        <p className={clsx('mt-3 text-sm', featured ? 'text-purple-200' : 'text-gray-400')}>
          <PlanDescription
            tier={tier}
            activePeriod={activePeriod}
            payWithCrypto={payWithCrypto}
            description={description}
            hasCreditBalance={hasCreditBalance}
            formattedCreditBalance={formattedCreditBalance}
            hasTrial={hasTrial}
          />
        </p>

        <div className='order-last mt-6'>
          <ol
            className={clsx(
              '-my-2 divide-y text-sm',
              featured ? 'divide-gray-700/50 text-gray-300' : 'divide-gray-700/30 text-gray-300',
            )}
          >
            {features.map((feature, index) => (
              <li key={index} className='flex py-2'>
                <CheckIcon
                  className={clsx(
                    'h-6 w-6 flex-none',
                    featured ? 'text-purple-400' : 'text-purple-500',
                    payWithCrypto && 'crypto-check animate-pulse-soft',
                  )}
                />
                <span className='ml-4'>{feature}</span>
              </li>
            ))}
          </ol>
        </div>

        {hasCreditBalance && tier === SUBSCRIPTION_TIERS.PRO && !hasActivePlan ? (
          <Tooltip title='Your credit balance will be automatically applied at checkout'>
            <Button
              loading={redirectingToCheckout}
              onClick={() => handleSubscribe()}
              disabled={isButtonDisabled()}
              size={featured ? 'large' : 'middle'}
              color={featured ? 'danger' : 'default'}
              className={clsx(
                'mt-6 w-full',
                featured
                  ? 'bg-purple-500 hover:bg-purple-400 text-gray-900 font-semibold'
                  : 'bg-gray-700 hover:bg-gray-600 text-gray-100',
                payWithCrypto && 'border-purple-400 animate-float crypto-button',
              )}
              aria-label={`Get started with the ${name} plan for ${price[activePeriod]}`}
              icon={payWithCrypto ? <Bitcoin size={16} className='animate-pulse' /> : undefined}
            >
              {buttonText}
            </Button>
          </Tooltip>
        ) : (
          <Button
            loading={redirectingToCheckout}
            onClick={() => handleSubscribe()}
            disabled={isButtonDisabled()}
            size={featured ? 'large' : 'middle'}
            color={featured ? 'danger' : 'default'}
            className={clsx(
              'mt-6',
              featured
                ? 'bg-purple-500 hover:bg-purple-400 text-gray-900 font-semibold'
                : 'bg-gray-700 hover:bg-gray-600 text-gray-100',
              payWithCrypto && 'crypto-button',
              payWithCrypto && !hasActivePlan && 'animate-float',
            )}
            aria-label={`Get started with the ${name} plan for ${price[activePeriod]}`}
            icon={payWithCrypto ? <Bitcoin size={16} className='animate-pulse' /> : undefined}
          >
            {buttonText}
          </Button>
        )}

        {isCryptoPaymentsEnabled && tier !== SUBSCRIPTION_TIERS.FREE && (
          <div className='mt-3 flex flex-col gap-2 text-center'>
            {/* Payment method selection - only show for Pro tier and if feature is enabled */}
            {tier === SUBSCRIPTION_TIERS.PRO && (
              <CryptoToggle
                payWithCrypto={payWithCrypto}
                setPayWithCrypto={setPayWithCrypto}
                activePeriod={activePeriod}
                featured={featured}
                isEnabled={isCryptoPaymentsEnabled}
              />
            )}
          </div>
        )}

        {/* Crypto interest button */}
        {!isCryptoPaymentsEnabled && tier !== SUBSCRIPTION_TIERS.FREE && (
          <div className='mt-3 flex flex-col gap-2 text-center'>
            <Tooltip
              title={
                cryptoInterest?.interested
                  ? "We'll add crypto payments if enough people want it. Check back soon!"
                  : "Let us know if you'd like to pay with cryptocurrency"
              }
            >
              {!cryptoInterest?.interested ? (
                <Button
                  type='link'
                  size='small'
                  icon={<Bitcoin size={16} />}
                  onClick={handleCryptoInterest}
                  loading={session ? loadingCryptoInterest : false}
                  className={clsx(
                    'text-xs',
                    featured
                      ? 'text-purple-300 hover:text-purple-200'
                      : 'text-gray-400 hover:text-gray-300',
                  )}
                >
                  <span className='break-words'>
                    {`Interested in paying with crypto? (${cryptoInterestData?.userCount ?? 1} interested)`}
                  </span>
                </Button>
              ) : (
                <span className='text-xs break-words'>
                  {`Thanks for your interest in crypto payments! (${cryptoInterestData?.userCount ?? 1} interested)`}
                </span>
              )}
            </Tooltip>
          </div>
        )}
      </section>
    </ErrorBoundary>
  )
}

export default Plan
