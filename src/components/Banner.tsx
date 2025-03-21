import { XMarkIcon } from '@heroicons/react/20/solid'
import { GRACE_PERIOD_END } from '@/utils/subscription'
import { useState } from 'react'
import Link from 'next/link'

export default function Banner() {
  const [dismissed, setDismissed] = useState(false)

  // Only show banner until April 30, 2025 and if not dismissed
  if (new Date() >= GRACE_PERIOD_END || dismissed) {
    return null
  }

  return (
    <div className='relative isolate flex items-center gap-x-6 overflow-hidden bg-gray-800 px-6 sm:before:flex-1'>
      <div
        aria-hidden='true'
        className='absolute top-1/2 left-[max(-7rem,calc(50%-52rem))] -z-10 -translate-y-1/2 transform-gpu blur-2xl'
      >
        <div
          style={{
            clipPath:
              'polygon(74.8% 41.9%, 97.2% 73.2%, 100% 34.9%, 92.5% 0.4%, 87.5% 0%, 75% 28.6%, 58.5% 54.6%, 50.1% 56.8%, 46.9% 44%, 48.3% 17.4%, 24.7% 53.9%, 0% 27.9%, 11.9% 74.2%, 24.9% 54.1%, 68.6% 100%, 74.8% 41.9%)',
          }}
          className='aspect-577/310 w-[36.0625rem] bg-gradient-to-r from-purple-600 to-indigo-700 opacity-40'
        />
      </div>
      <div
        aria-hidden='true'
        className='absolute top-1/2 left-[max(45rem,calc(50%+8rem))] -z-10 -translate-y-1/2 transform-gpu blur-2xl'
      >
        <div
          style={{
            clipPath:
              'polygon(74.8% 41.9%, 97.2% 73.2%, 100% 34.9%, 92.5% 0.4%, 87.5% 0%, 75% 28.6%, 58.5% 54.6%, 50.1% 56.8%, 46.9% 44%, 48.3% 17.4%, 24.7% 53.9%, 0% 27.9%, 11.9% 74.2%, 24.9% 54.1%, 68.6% 100%, 74.8% 41.9%)',
          }}
          className='aspect-577/310 w-[36.0625rem] bg-gradient-to-r from-purple-600 to-indigo-700 opacity-40'
        />
      </div>
      <p className='text-sm/6 text-gray-100 my-0!'>
        New Pricing Plans Coming April 30.{' '}
        <Link
          href='/blog/new-pricing-tiers'
          className='font-semibold whitespace-nowrap text-indigo-300 hover:text-indigo-200'
        >
          Learn More&nbsp;<span aria-hidden='true'>&rarr;</span>
        </Link>
      </p>
      <div className='flex flex-1 justify-end'>
        <button
          type='button'
          className='-m-3 p-3 focus-visible:outline-offset-[-4px]'
          onClick={(e) => {
            e.preventDefault()
            setDismissed(true)
          }}
        >
          <span className='sr-only'>Dismiss</span>
          <XMarkIcon aria-hidden='true' className='size-5 text-gray-200' />
        </button>
      </div>
    </div>
  )
}
