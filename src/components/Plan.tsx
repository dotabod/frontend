import { Button, notification, Tooltip } from 'antd'
import { useState } from 'react'
import { signIn, useSession } from 'next-auth/react'
import {
  getButtonText,
  getPriceId,
  isButtonDisabled,
  type SubscriptionStatus,
  TIER_LEVELS,
  type SubscriptionTier,
  calculateSavings,
} from '@/utils/subscription'
import { createCheckoutSession } from '@/lib/stripe'
import clsx from 'clsx'
import { CheckIcon } from 'lucide-react'
import { Logomark } from './Logo'

function Plan({
  name,
  price,
  description,
  button,
  features,
  activePeriod,
  logo,
  logomarkClassName,
  featured = false,
  subscription,
  onSubscriptionUpdate,
}: {
  name: string
  price: {
    Monthly: string
    Annually: string
  }
  logo: React.ReactNode
  description: string
  button: {
    label: string
    href: string
  }
  features: Array<React.ReactNode>
  activePeriod: 'Monthly' | 'Annually'
  logomarkClassName?: string
  featured?: boolean
  subscription: SubscriptionStatus | null
  onSubscriptionUpdate: (newSubscription: SubscriptionStatus) => void
}) {
  const { data: session } = useSession()
  const [redirectingToCheckout, setRedirectingToCheckout] = useState(false)
  const savings = calculateSavings(price.Monthly, price.Annually)

  const targetTier = name.toLowerCase() as SubscriptionTier
  const period = activePeriod.toLowerCase() as 'monthly' | 'annual'
  const buttonText = getButtonText(
    subscription,
    targetTier,
    period,
    button.label
  )
  const disabled = isButtonDisabled(subscription, targetTier, period)

  const handleSubscribe = async () => {
    setRedirectingToCheckout(true)
    try {
      if (!session) {
        await signIn('twitch', {
          callbackUrl: `/register?plan=${name.toLowerCase()}&period=${period}`,
        })
        return
      }

      if (subscription?.status === 'active') {
        const priceId = getPriceId(
          targetTier === 'free' ? 'starter' : targetTier,
          period
        )

        const response = await fetch('/api/stripe/update-subscription', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ priceId }),
        })

        if (!response.ok) {
          throw new Error('Failed to update subscription')
        }

        // Poll for subscription update
        let attempts = 0
        const maxAttempts = 10
        while (attempts < maxAttempts) {
          const subscriptionResponse = await fetch('/api/stripe/subscription')
          if (subscriptionResponse.ok) {
            const updatedSubscription = await subscriptionResponse.json()
            if (updatedSubscription.stripePriceId === priceId) {
              onSubscriptionUpdate(updatedSubscription)
              notification.success({
                message: 'Subscription Updated',
                description: `Successfully ${
                  subscription.tier === 'pro' ? 'downgraded to' : 'upgraded to'
                } ${name} plan.`,
                placement: 'bottomRight',
              })
              break
            }
          }
          attempts++
          await new Promise((resolve) => setTimeout(resolve, 200))
        }
        return
      }

      // Otherwise, create new checkout session for new subscribers
      const priceId = getPriceId(
        name.toLowerCase() as 'starter' | 'pro',
        period
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
        description:
          'Failed to process subscription change. Please try again later.',
        placement: 'bottomRight',
      })
    } finally {
      setRedirectingToCheckout(false)
    }
  }

  const getTooltipText = () => {
    if (
      !subscription ||
      subscription.status !== 'active' ||
      subscription.tier === targetTier
    ) {
      return 'Initial subscription payment'
    }

    const isUpgrade = TIER_LEVELS[targetTier] > TIER_LEVELS[subscription.tier]
    const periodText = period === 'monthly' ? 'month' : 'year'

    if (isUpgrade) {
      return `You'll be charged the prorated difference for the remainder of your ${periodText}`
    }

    return `You'll receive a prorated credit for the remainder of your ${periodText}`
  }

  return (
    <section
      className={clsx(
        'flex flex-col overflow-hidden rounded-3xl p-6 shadow-lg shadow-gray-900/5',
        featured
          ? 'order-first bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 ring-2 ring-purple-500 lg:order-none'
          : 'bg-gray-800/50 backdrop-blur-xl'
      )}
    >
      <h3
        className={clsx(
          'flex items-center text-sm font-semibold',
          featured ? 'text-purple-400' : 'text-gray-100'
        )}
      >
        {logo ? (
          logo
        ) : (
          <Logomark className={clsx('h-6 w-6 flex-none', logomarkClassName)} />
        )}
        <span className="ml-4">{name}</span>
      </h3>
      <p
        className={clsx(
          'relative mt-5 flex text-4xl font-bold tracking-tight',
          featured ? 'text-white' : 'text-gray-100'
        )}
      >
        {price.Monthly === price.Annually ? (
          price.Monthly
        ) : (
          <>
            <span
              aria-hidden={activePeriod === 'Annually'}
              className={clsx(
                'transition duration-300',
                activePeriod === 'Annually' &&
                  'pointer-events-none translate-x-6 opacity-0 select-none'
              )}
            >
              {price.Monthly}
              <span className="text-sm"> / month</span>
            </span>
            <span
              aria-hidden={activePeriod === 'Monthly'}
              className={clsx(
                'absolute top-0 left-0 transition duration-300',
                activePeriod === 'Monthly' &&
                  'pointer-events-none -translate-x-6 opacity-0 select-none'
              )}
            >
              {price.Annually}
              <span className="text-sm"> / year</span>
            </span>
          </>
        )}
      </p>
      {activePeriod === 'Annually' && !Number.isNaN(savings) && (
        <p
          className={clsx(
            '-mt-10 text-sm',
            featured ? 'text-purple-200' : 'text-gray-400'
          )}
        >
          Saving {savings}%
        </p>
      )}
      <p
        className={clsx(
          'mt-3 text-sm',
          featured ? 'text-purple-200' : 'text-gray-400'
        )}
      >
        {description}
      </p>
      <div className="order-last mt-6">
        <ol
          className={clsx(
            '-my-2 divide-y text-sm',
            featured
              ? 'divide-gray-700/50 text-gray-300'
              : 'divide-gray-700/30 text-gray-300'
          )}
        >
          {features.map((feature, index) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: <explanation>
            <li key={index} className="flex py-2">
              <CheckIcon
                className={clsx(
                  'h-6 w-6 flex-none',
                  featured ? 'text-purple-400' : 'text-purple-500'
                )}
              />
              <span className="ml-4">{feature}</span>
            </li>
          ))}
        </ol>
      </div>

      <Tooltip
        title={
          !disabled && subscription?.status === 'active'
            ? getTooltipText()
            : undefined
        }
      >
        <Button
          loading={redirectingToCheckout}
          onClick={handleSubscribe}
          size={featured ? 'large' : 'middle'}
          color={featured ? 'danger' : 'default'}
          disabled={disabled}
          className={clsx(
            'mt-6',
            featured
              ? 'bg-purple-500 hover:bg-purple-400 text-gray-900 font-semibold'
              : 'bg-gray-700 hover:bg-gray-600 text-gray-100'
          )}
          aria-label={`Get started with the ${name} plan for ${price[activePeriod]}`}
        >
          {buttonText}
        </Button>
      </Tooltip>
    </section>
  )
}

export default Plan
