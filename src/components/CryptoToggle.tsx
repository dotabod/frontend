import { Bitcoin, Info, Sparkles } from 'lucide-react'
import { Popover, Switch } from 'antd'
import clsx from 'clsx'
import { memo, useState, useEffect } from 'react'
import ErrorBoundary from './ErrorBoundary'

interface CryptoToggleProps {
  payWithCrypto: boolean
  setPayWithCrypto: (value: boolean) => void
  activePeriod: string
  featured?: boolean
}

// Create a dedicated component for the crypto toggle to better isolate DOM changes
const CryptoToggle = memo(
  ({ payWithCrypto, setPayWithCrypto, activePeriod, featured = false }: CryptoToggleProps) => {
    // Use local state to track if we're in the middle of toggling
    const [isToggling, setIsToggling] = useState(false)

    // Reset the toggling state after a delay
    useEffect(() => {
      let timer: NodeJS.Timeout

      if (isToggling) {
        timer = setTimeout(() => {
          setIsToggling(false)
        }, 300) // Match the animation duration
      }

      return () => {
        if (timer) clearTimeout(timer)
      }
    }, [isToggling])

    const handleToggle = () => {
      // Only allow toggle if we're not already toggling
      if (!isToggling) {
        setIsToggling(true)

        // Use requestAnimationFrame to ensure DOM is ready for changes
        requestAnimationFrame(() => {
          setPayWithCrypto(!payWithCrypto)
        })
      }
    }

    return (
      <ErrorBoundary>
        <div
          className={clsx(
            'flex items-center border border-transparent justify-center space-x-1 mt-2 mb-2 py-2 px-4 rounded-full transition-all duration-300',
            (payWithCrypto && 'crypto-toggle-container animate-glow') || '-mt-1!',
          )}
        >
          <Switch
            size='small'
            checked={payWithCrypto}
            onChange={handleToggle}
            className={clsx(
              'transition-colors duration-300',
              featured ? 'bg-purple-600' : '',
              payWithCrypto && 'crypto-switch',
            )}
          />
          <span
            className={clsx(
              'text-xs ml-2 cursor-pointer transition-all duration-300',
              featured ? 'text-purple-300' : 'text-gray-400',
              payWithCrypto && 'text-purple-300 font-medium',
            )}
            onClick={() => setPayWithCrypto(!payWithCrypto)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                setPayWithCrypto(!payWithCrypto)
              }
            }}
          >
            {payWithCrypto ? (
              <span className='flex items-center gap-1' key='crypto-pay-on'>
                <Bitcoin size={14} className='text-purple-300 animate-pulse' />
                <span>Pay with Crypto</span>
                <Sparkles size={14} className='text-purple-300 animate-sparkle' />
              </span>
            ) : (
              <span key='crypto-pay-off'>Pay with Crypto</span>
            )}
          </span>
          <Popover
            content={
              <div className='max-w-xs'>
                <p className='text-sm'>
                  {activePeriod === 'lifetime'
                    ? 'Make a one-time payment with USDC stablecoin.'
                    : "For recurring subscriptions, you'll receive invoices to pay with USDC stablecoin."}
                </p>
                <p className='text-sm mt-2 text-amber-500'>
                  Note: Free trials are not available with crypto payments.
                </p>
              </div>
            }
            title={
              <span className='flex items-center gap-2'>
                <Bitcoin
                  size={16}
                  className={payWithCrypto ? 'text-purple-400 animate-spin-slow' : ''}
                />
                Crypto Payments
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

CryptoToggle.displayName = 'CryptoToggle'

export default CryptoToggle
