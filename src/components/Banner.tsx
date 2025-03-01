import { GRACE_PERIOD_END } from '@/utils/subscription'
import { Alert } from 'antd'
import Link from 'next/link'

export default function Banner() {
  // Only show banner until April 30, 2025
  if (new Date() >= GRACE_PERIOD_END) {
    return null
  }

  return (
    <Link href='/blog/new-pricing-tiers' className='block no-underline'>
      <Alert
        message='New Pricing Plans Coming April 30—Learn More'
        banner
        type='info'
        showIcon={false}
        className='text-center font-medium text-white bg-purple-600 hover:bg-purple-500 transition-colors cursor-pointer border-0'
      />
    </Link>
  )
}
