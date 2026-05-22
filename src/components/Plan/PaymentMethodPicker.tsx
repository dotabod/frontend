import clsx from 'clsx'
import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from 'framer-motion'
import { Bitcoin, CreditCard, Wallet } from 'lucide-react'
import { memo, useId } from 'react'
import type { PricePeriod } from '@/utils/subscription'

export type PaymentMethod = 'card' | 'paypal' | 'crypto'

interface PaymentMethodPickerProps {
  value: PaymentMethod
  onChange: (method: PaymentMethod) => void
  activePeriod: PricePeriod
  cryptoEnabled: boolean
  paypalEnabled: boolean
}

const META: Record<PaymentMethod, { label: string; Icon: typeof CreditCard }> = {
  card: { label: 'Card', Icon: CreditCard },
  paypal: { label: 'PayPal', Icon: Wallet },
  crypto: { label: 'Crypto', Icon: Bitcoin },
}

// ease-out-quint: confident deceleration, no overshoot
const EASE = [0.22, 1, 0.36, 1] as const

function noteFor(method: PaymentMethod, period: PricePeriod): string {
  const isLifetime = period === 'lifetime'
  switch (method) {
    case 'paypal':
      return isLifetime
        ? 'One-time payment through your PayPal account.'
        : 'Renews automatically through your PayPal account.'
    case 'crypto':
      return isLifetime
        ? 'One-time payment in BTC, USDT, ETH, and 100+ other coins.'
        : "You'll get an invoice each period to pay in BTC, USDT, ETH, and 100+ other coins."
    default:
      return isLifetime ? 'One-time card payment.' : 'Renews automatically. Cancel anytime.'
  }
}

const PaymentMethodPicker = memo(
  ({ value, onChange, activePeriod, cryptoEnabled, paypalEnabled }: PaymentMethodPickerProps) => {
    const reduce = useReducedMotion()
    const groupId = useId()

    const options: PaymentMethod[] = ['card']
    if (paypalEnabled) options.push('paypal')
    if (cryptoEnabled) options.push('crypto')

    // With only the card option there is nothing to choose between.
    if (options.length < 2) return null

    return (
      <div className='mt-6'>
        <span className='mb-1.5 block text-xs text-gray-400'>Payment method</span>
        <LayoutGroup id={groupId}>
          <fieldset
            className='grid gap-1 rounded-md border border-gray-700 bg-gray-800/60 p-1'
            style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
          >
            <legend className='sr-only'>Payment method</legend>
            {options.map((method) => {
              const { label, Icon } = META[method]
              const selected = value === method
              return (
                <motion.label
                  key={method}
                  className='relative block'
                  whileTap={reduce ? undefined : { scale: 0.97 }}
                  transition={{ duration: 0.15, ease: EASE }}
                >
                  <input
                    type='radio'
                    name={`payment-method-${groupId}`}
                    value={method}
                    checked={selected}
                    onChange={() => onChange(method)}
                    className='peer sr-only'
                  />
                  {selected && (
                    <motion.span
                      layoutId='payment-method-indicator'
                      aria-hidden
                      className='absolute inset-0 rounded-sm bg-gray-700'
                      transition={reduce ? { duration: 0 } : { duration: 0.2, ease: EASE }}
                    />
                  )}
                  <span
                    className={clsx(
                      'relative z-10 flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-sm px-2 py-1.5 text-sm transition-colors',
                      'peer-focus-visible:outline-hidden peer-focus-visible:ring-2 peer-focus-visible:ring-purple-500 peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-gray-900',
                      selected ? 'font-medium text-gray-100' : 'text-gray-400 hover:text-gray-200',
                    )}
                  >
                    <Icon size={14} aria-hidden />
                    <span>{label}</span>
                  </span>
                </motion.label>
              )
            })}
          </fieldset>
        </LayoutGroup>
        <div className='mt-2 min-h-4 text-xs text-gray-400'>
          <AnimatePresence mode='wait' initial={false}>
            <motion.p
              key={`${value}-${activePeriod}`}
              initial={reduce ? false : { opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, y: -4 }}
              transition={reduce ? { duration: 0 } : { duration: 0.2, ease: EASE }}
            >
              {noteFor(value, activePeriod)}
            </motion.p>
          </AnimatePresence>
        </div>
      </div>
    )
  },
)

PaymentMethodPicker.displayName = 'PaymentMethodPicker'

export default PaymentMethodPicker
