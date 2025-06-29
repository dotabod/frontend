import { Radio, RadioGroup } from '@headlessui/react'
import clsx from 'clsx'
import { useEffect } from 'react'
import { plans } from '@/components/Billing/BillingPlans'
import {
  calculateSavings,
  getCurrentPeriod,
  isSubscriptionActive,
  type PricePeriod,
  type SubscriptionRow,
} from '@/utils/subscription'

interface PeriodToggleProps {
  activePeriod: PricePeriod
  onChange: (period: PricePeriod) => void
  subscription: SubscriptionRow | null
}

export function PeriodToggle({ activePeriod, onChange, subscription }: PeriodToggleProps) {
  // Set initial period based on subscription
  useEffect(() => {
    if (isSubscriptionActive({ status: subscription?.status })) {
      const period = getCurrentPeriod(subscription?.stripePriceId)
      onChange(period)
    }
  }, [subscription, onChange])

  return (
    <RadioGroup
      value={activePeriod}
      onChange={onChange}
      className='flex flex-col sm:grid sm:grid-cols-3 rounded-lg'
    >
      {['monthly', 'annual', 'lifetime'].map((period) => (
        <div
          key={period}
          className={clsx('relative py-1.5 sm:py-0 sm:flex sm:flex-col', 'sm:min-h-[3.5rem]')}
        >
          <Radio
            value={period}
            className={clsx(
              'bg-gray-800/50 cursor-pointer px-3 sm:px-4 md:px-8 py-2 text-sm transition-colors rounded-md',
              'w-full flex items-center justify-center',
              'focus:outline-hidden focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-gray-900',
              activePeriod === period
                ? 'bg-purple-500 text-gray-900 font-semibold shadow-lg'
                : 'text-gray-300 hover:bg-gray-700/50',
            )}
          >
            <span className='first-letter:uppercase'>{period}</span>
          </Radio>

          <div
            className={clsx(
              'text-center text-xs pt-1 mt-1 sm:h-6 bg-initial',
              activePeriod === period ? 'text-purple-400' : 'text-purple-300',
            )}
          >
            {period === 'annual' &&
              `Save up to ${Math.max(
                ...plans
                  .filter((plan) => plan.price.monthly !== '$0')
                  .map((plan) => calculateSavings(plan.price.monthly, plan.price.annual)),
              )}%`}

            {period === 'lifetime' && 'Pay once, use forever'}
          </div>
        </div>
      ))}
    </RadioGroup>
  )
}
