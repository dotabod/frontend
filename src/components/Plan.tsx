import { createCheckoutSession } from '@/lib/stripe'
import {
  type PricePeriod,
  type SUBSCRIPTION_TIERS,
  type SubscriptionStatus,
  type SubscriptionTier,
  calculateSavings,
  getPriceId,
  isButtonDisabled,
  isSubscriptionActive,
} from '@/utils/subscription'
import { Button, notification } from 'antd'
import clsx from 'clsx'
import { CheckIcon } from 'lucide-react'
import { signIn, useSession } from 'next-auth/react'
import Image from 'next/image'
import { useState } from 'react'
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
  subscription,
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
  subscription: SubscriptionStatus | null
  hasTrial?: boolean
}) {
  const { data: session } = useSession()
  const [redirectingToCheckout, setRedirectingToCheckout] = useState(false)
  const savings = calculateSavings(price.monthly, price.annual)

  // Update description display to show trial info
  const displayDescription = () => {
    if (
      hasTrial &&
      tier === 'pro' &&
      activePeriod !== 'lifetime' &&
      (!subscription || subscription.status !== 'active')
    ) {
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
    if (subscription?.status === 'trialing') {
      return 'Currently trialing'
    }

    if (!subscription || subscription.status !== 'active') {
      if (tier === 'pro' && activePeriod === 'lifetime') {
        return 'Get lifetime access'
      }

      if (tier === 'pro' && activePeriod !== 'lifetime') {
        return 'Start free trial'
      }
      return button.label
    }

    return 'Manage plan'
  }

  const buttonText = getSimplifiedButtonText()

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
      if (tier === 'free') {
        window.location.href = '/dashboard'
        return
      }
      // If user has an active subscription or is trialing, redirect to portal
      if (isSubscriptionActive({ status: subscription?.status })) {
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
          activePeriod === 'lifetime' && tier === 'pro' ? (
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
        disabled={isButtonDisabled(subscription, tier, activePeriod)}
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
    </section>
  )
}

export default Plan
