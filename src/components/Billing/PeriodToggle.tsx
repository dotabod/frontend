import clsx from 'clsx'
import { LayoutGroup, motion, useReducedMotion } from 'framer-motion'
import { useId } from 'react'
import { plans } from '@/components/Billing/BillingPlans'
import { calculateSavings, type PricePeriod } from '@/utils/subscription'

interface PeriodToggleProps {
  activePeriod: PricePeriod
  onChange: (period: PricePeriod) => void
}

// ease-out-quint
const EASE = [0.22, 1, 0.36, 1] as const

export function PeriodToggle({ activePeriod, onChange }: PeriodToggleProps) {
  const periods: PricePeriod[] = ['monthly', 'annual', 'lifetime']
  const reduce = useReducedMotion()
  const groupId = useId()

  // Computed in render (not module scope) because `plans` is a circular import
  // from BillingPlans and may be uninitialised at module-eval time.
  const maxSavings = Math.max(
    ...plans
      .filter((plan) => plan.price.monthly !== '$0')
      .map((plan) => calculateSavings(plan.price.monthly, plan.price.annual)),
  )

  return (
    <div className='flex w-full max-w-sm flex-col items-center sm:w-auto sm:max-w-none'>
      <span aria-hidden className='mb-2 text-xs text-gray-500'>
        Billing
      </span>
      <LayoutGroup id={groupId}>
        <fieldset className='relative grid w-full grid-cols-3 gap-1 rounded-lg border border-gray-800 bg-gray-900/60 p-1 sm:w-auto'>
          <legend className='sr-only'>Billing</legend>
          {periods.map((period) => {
            const selected = activePeriod === period
            const showSavings = period === 'annual' && Number.isFinite(maxSavings) && maxSavings > 0
            return (
              <label key={period} className='relative block'>
                <input
                  type='radio'
                  name={`billing-period-${groupId}`}
                  value={period}
                  checked={selected}
                  onChange={() => onChange(period)}
                  className='peer sr-only'
                />
                {selected && (
                  <motion.span
                    layoutId='billing-period-indicator'
                    aria-hidden
                    className='absolute inset-0 rounded-md bg-purple-500 shadow-sm'
                    transition={reduce ? { duration: 0 } : { duration: 0.2, ease: EASE }}
                  />
                )}
                <span
                  className={clsx(
                    'relative z-10 flex w-full cursor-pointer flex-wrap items-center justify-center gap-x-1.5 gap-y-0.5 rounded-md px-3 py-2 text-sm capitalize transition-colors sm:px-4 md:px-6',
                    'peer-focus-visible:outline-hidden peer-focus-visible:ring-2 peer-focus-visible:ring-purple-500 peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-gray-900',
                    selected ? 'font-semibold text-gray-900' : 'text-gray-300 hover:text-gray-100',
                  )}
                >
                  {period}
                  {showSavings && (
                    <span
                      className={clsx(
                        'rounded-full px-1.5 py-0.5 text-[0.625rem] font-semibold leading-none',
                        selected
                          ? 'bg-gray-900/15 text-gray-900'
                          : 'bg-purple-500/15 text-purple-300',
                      )}
                    >
                      Save {maxSavings}%
                    </span>
                  )}
                </span>
              </label>
            )
          })}
        </fieldset>
      </LayoutGroup>
    </div>
  )
}
