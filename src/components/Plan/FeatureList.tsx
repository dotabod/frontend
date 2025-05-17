import clsx from 'clsx'
import { CheckIcon } from 'lucide-react'

interface FeatureListProps {
  features: Array<React.ReactNode>
  featured: boolean
  payWithCrypto: boolean
}

export const FeatureList = ({ features, featured, payWithCrypto }: FeatureListProps) => {
  return (
    <div className='order-last mt-6'>
      <ol
        className={clsx(
          '-my-2 divide-y text-sm',
          featured ? 'divide-gray-700/50 text-gray-300' : 'divide-gray-700/30 text-gray-300',
        )}
      >
        {features.map((feature, index) => (
          <li key={index} className='flex py-2'>
            <CheckIcon
              className={clsx(
                'h-6 w-6 flex-none',
                featured ? 'text-purple-400' : 'text-purple-500',
                payWithCrypto && 'crypto-check animate-pulse-soft',
              )}
            />
            <span className='ml-4'>{feature}</span>
          </li>
        ))}
      </ol>
    </div>
  )
}
