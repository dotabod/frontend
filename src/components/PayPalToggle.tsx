import { Popover, Switch } from 'antd'
import clsx from 'clsx'
import { Info, Wallet } from 'lucide-react'
import { memo } from 'react'
import ErrorBoundary from './ErrorBoundary'

interface PayPalToggleProps {
  payWithPaypal: boolean
  setPayWithPaypal: (value: boolean) => void
  activePeriod: string
  featured?: boolean
  isEnabled?: boolean
}

const PayPalToggle = memo(
  ({
    payWithPaypal,
    setPayWithPaypal,
    activePeriod,
    featured = false,
    isEnabled = false,
  }: PayPalToggleProps) => {
    if (!isEnabled) return null

    return (
      <ErrorBoundary>
        <div className='flex items-center border border-transparent justify-center gap-2 -mt-1! py-2 px-4 rounded-full transition-all duration-300'>
          <Switch
            size='small'
            checked={payWithPaypal}
            onChange={() => setPayWithPaypal(!payWithPaypal)}
            className={clsx('transition-colors duration-300', featured ? 'bg-blue-600' : '')}
          />
          <button
            type='button'
            className={clsx(
              'text-xs cursor-pointer transition-all duration-300 bg-transparent border-0 p-0 font-inherit',
              featured ? 'text-blue-300' : 'text-gray-400',
              payWithPaypal && 'text-blue-300 font-medium',
            )}
            onClick={() => setPayWithPaypal(!payWithPaypal)}
          >
            <span className='flex items-center gap-1'>
              <Wallet size={14} className={payWithPaypal ? 'text-blue-300' : ''} />
              <span>Pay with PayPal</span>
            </span>
          </button>
          <Popover
            content={
              <div className='max-w-xs'>
                <p className='text-sm'>
                  {activePeriod === 'lifetime'
                    ? 'One-time payment through your PayPal account.'
                    : 'Pay through PayPal. Renewals are charged automatically each period to your PayPal account.'}
                </p>
                <p className='text-sm mt-2 text-amber-500'>
                  Note: Free trials are not available with PayPal payments.
                </p>
              </div>
            }
            title={
              <span className='flex items-center gap-2'>
                <Wallet size={16} className={payWithPaypal ? 'text-blue-400' : ''} />
                PayPal Payments
              </span>
            }
          >
            <Info
              size={14}
              className='text-gray-400 cursor-pointer ml-1 transition-opacity duration-300 hover:text-gray-300'
            />
          </Popover>
        </div>
      </ErrorBoundary>
    )
  },
)

PayPalToggle.displayName = 'PayPalToggle'

export default PayPalToggle
