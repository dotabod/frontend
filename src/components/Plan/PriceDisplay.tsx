import clsx from 'clsx'
import { type PricePeriod } from '@/utils/subscription'
import { type SubscriptionTier } from '@prisma/client'
import { PlanDescription } from '../PlanDescription'

interface Price {
  monthly: string
  annual: string
  lifetime: string
}

interface PriceDisplayProps {
  price: Price
  activePeriod: PricePeriod
  savings: number
  tier: SubscriptionTier
  featured: boolean
  payWithCrypto: boolean
  description: string
  hasCreditBalance: boolean
  formattedCreditBalance: string
  hasTrial: boolean
}

export const PriceDisplay = ({
  price,
  activePeriod,
  savings,
  tier,
  featured,
  payWithCrypto,
  description,
  hasCreditBalance,
  formattedCreditBalance,
  hasTrial,
}: PriceDisplayProps) => {
  return (
    <>
      <div className='relative mt-5'>
        <p
          className={clsx(
            'flex text-4xl font-bold tracking-tight',
            featured ? 'text-white' : 'text-gray-100',
            payWithCrypto && 'crypto-price',
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
      </div>

      {activePeriod === 'annual' && !Number.isNaN(savings) && (
        <p className={clsx('-mt-10 text-sm', featured ? 'text-purple-200' : 'text-gray-400')}>
          Saving {savings}%
        </p>
      )}
      <p className={clsx('mt-3 text-sm', featured ? 'text-purple-200' : 'text-gray-400')}>
        <PlanDescription
          tier={tier}
          activePeriod={activePeriod}
          payWithCrypto={payWithCrypto}
          description={description}
          hasCreditBalance={hasCreditBalance}
          formattedCreditBalance={formattedCreditBalance}
          hasTrial={hasTrial}
        />
      </p>
    </>
  )
}
