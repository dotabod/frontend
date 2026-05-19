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
  const periods: PricePeriod[] = ['monthly', 'annual', 'lifetime']
  const radioGroupName = 'billing-period'

  // Set initial period based on subscription
  useEffect(() => {
    if (isSubscriptionActive({ status: subscription?.status })) {
      const period = getCurrentPeriod(subscription?.stripePriceId)
      onChange(period)
    }
  }, [subscription, onChange])

  return (
    <fieldset className='flex flex-col sm:grid sm:grid-cols-3 rounded-lg'>
      <legend className='contents'>
        <span className='sr-only'>Billing period</span>
      </legend>
      {periods.map((period) => (
        <div
          key={period}
          className={clsx('relative py-1.5 sm:py-0 sm:flex sm:flex-col', 'sm:min-h-[3.5rem]')}
        >
          <label className='block'>
            <input
              type='radio'
              name={radioGroupName}
              value={period}
              checked={activePeriod === period}
              onChange={() => onChange(period)}
              className='peer sr-only'
            />
            <span
              className={clsx(
                'bg-gray-800/50 cursor-pointer px-3 sm:px-4 md:px-8 py-2 text-sm transition-colors rounded-md',
                'flex w-full items-center justify-center',
                'peer-focus-visible:outline-hidden peer-focus-visible:ring-2 peer-focus-visible:ring-purple-500 peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-gray-900',
                activePeriod === period
                  ? 'bg-purple-500 text-gray-900 font-semibold shadow-lg'
                  : 'text-gray-300 hover:bg-gray-700/50',
              )}
            >
              <span className='first-letter:uppercase'>{period}</span>
            </span>
          </label>

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
    </fieldset>
  )
}
