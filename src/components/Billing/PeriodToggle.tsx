import clsx from 'clsx'
import { Radio, RadioGroup } from '@headlessui/react'
import { calculateSavings } from '@/utils/subscription'
import { plans } from '@/components/Billing/BillingPlans'

interface PeriodToggleProps {
  activePeriod: 'Monthly' | 'Annually'
  onChange: (period: 'Monthly' | 'Annually') => void
}

export function PeriodToggle({ activePeriod, onChange }: PeriodToggleProps) {
  return (
    <RadioGroup
      value={activePeriod}
      onChange={onChange}
      className="grid grid-cols-2 bg-gray-800/50 p-1 rounded-lg"
    >
      {['Monthly', 'Annually'].map((period) => (
        <Radio
          key={period}
          value={period}
          className={clsx(
            'cursor-pointer px-8 py-2 text-sm transition-colors rounded-md flex items-center gap-2',
            'focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-gray-900',
            activePeriod === period
              ? 'bg-purple-500 text-gray-900 font-semibold shadow-lg'
              : 'text-gray-300 hover:bg-gray-700/50'
          )}
        >
          <div className="flex flex-col items-center gap-1">
            {period}
            {period === 'Annually' && (
              <div
                className={clsx(
                  'absolute -bottom-6 text-xs whitespace-nowrap',
                  activePeriod === period
                    ? 'text-purple-400'
                    : 'text-purple-300'
                )}
              >
                Save up to{' '}
                {Math.max(
                  ...plans
                    .filter((plan) => plan.price.Monthly !== '$0')
                    .map((plan) =>
                      calculateSavings(plan.price.Monthly, plan.price.Annually)
                    )
                )}
                %
              </div>
            )}
          </div>
        </Radio>
      ))}
    </RadioGroup>
  )
}
