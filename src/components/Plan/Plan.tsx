import { SubscriptionStatus, type SubscriptionTier, TransactionType } from '@prisma/client'
import { App, Button, Tooltip } from 'antd'
import clsx from 'clsx'
import { Bitcoin, Wallet } from 'lucide-react'
import Image from 'next/image'
import { useRouter } from 'next/router'
import { signIn, useSession } from 'next-auth/react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import useSWR from 'swr'
import { useSubscriptionContext } from '@/contexts/SubscriptionContext'
import { Settings } from '@/lib/defaultSettings'
import { isFeatureEnabled } from '@/lib/featureFlags'
import { fetcher } from '@/lib/fetcher'
import { STABLE_SWR_OPTIONS, useUpdateSetting } from '@/lib/hooks/useUpdateSetting'
import { createPaypalCheckout } from '@/lib/paypal-client'
import { createCheckoutSession } from '@/lib/stripe'
import {
  calculateSavings,
  getPriceId,
  gracePeriodPrettyDate,
  isPaypalSubscription,
  isSubscriptionActive,
  type PricePeriod,
  SUBSCRIPTION_TIERS,
  type SubscriptionRow,
} from '@/utils/subscription'
import ErrorBoundary from '../ErrorBoundary'
import { Logomark } from '../Logo'
import { FeatureList } from './FeatureList'
import PaymentMethodPicker, { type PaymentMethod } from './PaymentMethodPicker'
import { PriceDisplay } from './PriceDisplay'

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
    STABLE_SWR_OPTIONS,
  )

  const { message, modal, notification } = App.useApp()
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

  // Check if the current subscription was paid with crypto.
  // Prefer explicit subscription metadata and only fall back to price IDs when
  // crypto price IDs are distinct from regular price IDs.
  const isPaidWithCrypto = useMemo(() => {
    if (tier === SUBSCRIPTION_TIERS.FREE) return false

    const metadata =
      subscription?.metadata &&
      typeof subscription.metadata === 'object' &&
      !Array.isArray(subscription.metadata)
        ? (subscription.metadata as Record<string, unknown>)
        : null

    // Strong signal: crypto subscriptions set this metadata flag server-side
    const isCryptoFromMetadata =
      metadata?.isCryptoPayment === true || metadata?.isCryptoPayment === 'true'

    if (isCryptoFromMetadata) return true

    if (!subscription?.stripePriceId) return false

    const regularPriceIds = [
      getPriceId(SUBSCRIPTION_TIERS.PRO, 'monthly', false),
      getPriceId(SUBSCRIPTION_TIERS.PRO, 'annual', false),
      getPriceId(SUBSCRIPTION_TIERS.PRO, 'lifetime', false),
    ]

    const cryptoPriceIds = [
      getPriceId(SUBSCRIPTION_TIERS.PRO, 'monthly', true),
      getPriceId(SUBSCRIPTION_TIERS.PRO, 'annual', true),
      getPriceId(SUBSCRIPTION_TIERS.PRO, 'lifetime', true),
    ]

    // If crypto IDs overlap with regular IDs in config, treat price ID matching
    // as ambiguous and avoid forcing crypto state in the UI.
    const hasDistinctCryptoPrice =
      cryptoPriceIds.includes(subscription.stripePriceId) &&
      !regularPriceIds.includes(subscription.stripePriceId)

    return hasDistinctCryptoPrice
  }, [subscription?.metadata, subscription?.stripePriceId, tier])

  // Check if crypto payments feature is enabled
  const isCryptoPaymentsEnabled = isFeatureEnabled('enableCryptoPayments')
  // Check if PayPal payments feature is enabled
  const isPaypalPaymentsEnabled = isFeatureEnabled('enablePaypalPayments')

  // Detect whether the current subscription was paid with PayPal
  const isPaidWithPaypal = useMemo(() => {
    if (tier === SUBSCRIPTION_TIERS.FREE) return false
    return isPaypalSubscription(subscription)
  }, [subscription, tier])

  // A single source of truth for the chosen payment method. Card is the
  // default; PayPal/Crypto are only pre-selected when the active subscription
  // already uses them and the feature is enabled.
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(() => {
    if (tier !== SUBSCRIPTION_TIERS.PRO) return 'card'
    if (isPaypalPaymentsEnabled && isPaidWithPaypal) return 'paypal'
    if (isCryptoPaymentsEnabled && isPaidWithCrypto) return 'crypto'
    return 'card'
  })
  const payWithCrypto = paymentMethod === 'crypto'
  const payWithPaypal = paymentMethod === 'paypal'

  // Re-sync the method once subscription data resolves, and fall back to card if
  // a feature flag is turned off while its method is selected.
  useEffect(() => {
    if (isCryptoPaymentsEnabled && tier === SUBSCRIPTION_TIERS.PRO && isPaidWithCrypto) {
      setPaymentMethod('crypto')
    } else if (!isCryptoPaymentsEnabled && payWithCrypto) {
      setPaymentMethod('card')
    }
  }, [tier, isPaidWithCrypto, isCryptoPaymentsEnabled, payWithCrypto])

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

  // Function to handle removal of crypto interest
  const handleRemoveCryptoInterest = async () => {
    if (!session) {
      message.info('Please sign in to update your crypto payment preferences')
      return
    }

    try {
      // Call the update function to set interested to false
      updateCryptoInterest({
        interested: false,
        tier: tier,
        transactionType:
          activePeriod === 'lifetime' ? TransactionType.LIFETIME : TransactionType.RECURRING,
      })

      // Optimistically update the UI
      if (cryptoInterestData && cryptoInterestData.userCount > 0) {
        mutateCryptoInterestData(
          {
            ...cryptoInterestData,
            userCount: cryptoInterestData.userCount - 1,
          },
          false,
        )
      }
    } catch (error) {
      console.error('Error removing crypto interest:', error)
      notification.error({
        message: 'Error',
        description: 'Failed to update your interest status. Please try again later.',
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

    // If PayPal is selected, reflect that in the button text
    if (payWithPaypal && isProTier) {
      return isLifetimePeriod ? 'Get lifetime access with PayPal' : 'Subscribe with PayPal'
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
      const usePayWithPaypal = payWithPaypal && !usePayWithCrypto
      const selectedMethod = usePayWithCrypto ? 'crypto' : usePayWithPaypal ? 'paypal' : undefined

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

        // PayPal is decoupled from Stripe price IDs — it only needs the period.
        if (usePayWithPaypal) {
          const response = await createPaypalCheckout(activePeriod)
          if (!response.url) {
            throw new Error('Failed to create checkout session')
          }
          window.location.href = response.url
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
              title: `Upgrade to ${activePeriod} plan`,
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
              okText: `Upgrade to ${activePeriod}`,
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
              title: `Switch to crypto ${activePeriod} plan`,
              content: (
                <div className='space-y-2 mt-2'>
                  <p>
                    You're switching from a regular {currentRegularPeriod} plan to a crypto{' '}
                    {activePeriod} plan. Here's what will happen:
                  </p>
                  <ul className='list-disc pl-4 space-y-1'>
                    <li>You'll be charged for a new crypto-based {activePeriod} subscription</li>
                    <li>Your current regular subscription will be canceled</li>
                    <li>
                      Future payments can be made in BTC, USDT, USDC, ETH, or 100+ other
                      cryptocurrencies
                    </li>
                    <li>Your access to Pro features will continue uninterrupted</li>
                    <li className='text-amber-400'>
                      Crypto subscriptions do not auto-renew, so you'll receive an invoice to pay
                      manually
                    </li>
                  </ul>
                  <p className='mt-4'>Would you like to proceed with this change?</p>
                </div>
              ),
              okText: `Switch to crypto ${activePeriod}`,
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
            title: `Switch to regular ${activePeriod} plan`,
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
                  <li className='text-emerald-400'>
                    Your subscription will auto-renew, so there is no need to pay invoices manually
                  </li>
                </ul>
                <p className='mt-4'>Would you like to proceed with this change?</p>
              </div>
            ),
            okText: `Switch to regular ${activePeriod}`,
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
            title: 'Upgrade to lifetime access',
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
            okText: 'Upgrade to lifetime',
            cancelText: 'Cancel',
            onOk: async () => {
              try {
                // Create new checkout session for lifetime upgrade
                const priceId = getPriceId(SUBSCRIPTION_TIERS.PRO, 'lifetime', usePayWithCrypto)
                const response = await createCheckoutSession(
                  priceId,
                  session.user.id,
                  selectedMethod,
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
        const response = await createCheckoutSession(priceId, session.user.id, selectedMethod)

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
      payWithPaypal,
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
          'relative flex flex-col rounded-2xl p-6 sm:p-8',
          featured
            ? 'order-first bg-gray-900 shadow-lg shadow-black/20 ring-1 ring-purple-500/50 lg:order-none'
            : 'bg-gray-900/40 ring-1 ring-gray-800',
        )}
      >
        <h3 className='flex flex-wrap items-center gap-x-3 gap-y-2 text-sm font-semibold text-gray-100'>
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
          <span>{name}</span>
          {featured && !hasActivePlan && !inGracePeriod && (
            <span className='rounded-full border border-purple-500/40 bg-purple-500/10 px-2 py-0.5 text-xs font-medium text-purple-300'>
              Recommended
            </span>
          )}
          {inGracePeriod &&
            tier === SUBSCRIPTION_TIERS.PRO &&
            !hasActivePlan &&
            activePeriod !== 'lifetime' && (
              <span className='text-xs px-2 py-0.5 bg-purple-500/20 text-purple-300 rounded-full'>
                Free until {gracePeriodPrettyDate}
              </span>
            )}
          {hasActivePlan && isCurrentPlan && (
            <span className='text-xs px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300'>
              Your plan
            </span>
          )}
          {hasCreditBalance && tier === SUBSCRIPTION_TIERS.PRO && activePeriod !== 'lifetime' && (
            <span className='flex items-center gap-1 rounded-full border border-indigo-500/30 bg-indigo-500/15 px-2 py-0.5 text-xs text-indigo-300'>
              <Wallet size={12} />
              Credit: {formattedCreditBalance}
            </span>
          )}
        </h3>

        <PriceDisplay
          price={price}
          activePeriod={activePeriod}
          savings={savings}
          tier={tier}
          featured={featured}
          payWithCrypto={payWithCrypto}
          payWithPaypal={payWithPaypal}
          description={description}
          hasCreditBalance={hasCreditBalance}
          formattedCreditBalance={formattedCreditBalance}
          hasTrial={hasTrial}
        />

        <FeatureList features={features} featured={featured} payWithCrypto={payWithCrypto} />

        {tier === SUBSCRIPTION_TIERS.PRO &&
          (isCryptoPaymentsEnabled || isPaypalPaymentsEnabled) && (
            <PaymentMethodPicker
              value={paymentMethod}
              onChange={setPaymentMethod}
              activePeriod={activePeriod}
              cryptoEnabled={isCryptoPaymentsEnabled}
              paypalEnabled={isPaypalPaymentsEnabled}
            />
          )}

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
                  : 'border border-gray-700 bg-transparent text-gray-200 hover:border-gray-600 hover:bg-gray-800',
              )}
              aria-label={`${buttonText} (${name} plan)`}
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
                : 'border border-gray-700 bg-transparent text-gray-200 hover:border-gray-600 hover:bg-gray-800',
            )}
            aria-label={`${buttonText} (${name} plan)`}
          >
            {buttonText}
          </Button>
        )}

        {/* Crypto interest button */}
        {!isCryptoPaymentsEnabled && tier !== SUBSCRIPTION_TIERS.FREE && (
          <div className='mt-3 flex flex-col gap-2 text-center'>
            <Tooltip
              title={
                cryptoInterest?.interested
                  ? "We'll add crypto payments if enough people want it. Click to remove your interest."
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
                    {`Interested in paying with crypto? (${cryptoInterestData?.userCount ?? 0} interested)`}
                  </span>
                </Button>
              ) : (
                <div className='flex flex-col gap-1 items-center'>
                  <span className='text-xs break-words'>
                    {`Thanks for your interest in crypto payments! (${cryptoInterestData?.userCount ?? 0} interested)`}
                  </span>
                  <Button
                    type='link'
                    size='small'
                    onClick={handleRemoveCryptoInterest}
                    loading={session ? loadingCryptoInterest : false}
                    className={clsx(
                      'text-xs!',
                      featured
                        ? 'text-purple-300/70 hover:text-purple-200'
                        : 'text-gray-400/70 hover:text-gray-300',
                    )}
                  >
                    Remove my interest
                  </Button>
                </div>
              )}
            </Tooltip>
          </div>
        )}
      </section>
    </ErrorBoundary>
  )
}

export default Plan
