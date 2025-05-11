import { GRACE_PERIOD_END } from '@/utils/subscription'
import { XMarkIcon } from '@heroicons/react/20/solid'
import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'

// Reusable type for countdown time
type CountdownTime = { hours: number; minutes: number; seconds: number } | null

export default function Banner() {
  const [dismissed, setDismissed] = useState(false)
  const [banEndTimeRemaining, setBanEndTimeRemaining] = useState<CountdownTime>(null)
  const [gracePeriodEndTimeRemaining, setGracePeriodEndTimeRemaining] =
    useState<CountdownTime>(null)

  // Create dates only once during component initialization, not on every render
  const { BAN_END_DATE, effectiveGracePeriodEnd, currentDate, CRYPTO_ANNOUNCEMENT_DATE } =
    useMemo(() => {
      const now = new Date()

      // Set dates based on environment
      // In development, set the ban end date to be a few hours from now for testing
      const banEndDate =
        process.env.NODE_ENV === 'development'
          ? (() => {
              const devEndDate = new Date(now)
              devEndDate.setMinutes(devEndDate.getMinutes() + 5) // 2 hours from now
              return devEndDate
            })()
          : new Date('2025-04-06T17:13:42Z') // Production date: April 6, 2025

      // In development, set the grace period end date to be 4 hours from now (after ban end)
      const devGracePeriodEnd = (() => {
        const devGraceEndDate = new Date(now)
        devGraceEndDate.setHours(devGraceEndDate.getHours() + 4) // 4 hours from now
        return devGraceEndDate
      })()

      // Use imported GRACE_PERIOD_END for production, dev date for development
      const gracePeriodEnd =
        process.env.NODE_ENV === 'development' ? devGracePeriodEnd : GRACE_PERIOD_END

      // Crypto announcement date
      const cryptoAnnouncementDate =
        process.env.NODE_ENV === 'development'
          ? (() => {
              const devCryptoDate = new Date(now)
              devCryptoDate.setHours(devCryptoDate.getHours() + 1) // 1 hour from now for testing
              return devCryptoDate
            })()
          : new Date('2025-04-09T12:00:00Z') // Production date: April 9, 2025

      return {
        BAN_END_DATE: banEndDate,
        effectiveGracePeriodEnd: gracePeriodEnd,
        currentDate: now,
        CRYPTO_ANNOUNCEMENT_DATE: cryptoAnnouncementDate,
      }
    }, [])

  // Helper to check if two dates have the same month and day - memoized to prevent recreation
  const isSameMonthAndDay = useCallback((date1: Date, date2: Date) => {
    return date1.getMonth() === date2.getMonth() && date1.getDate() === date2.getDate()
  }, [])

  // Shared function to calculate time remaining until a target date
  const calculateTimeRemaining = useCallback((targetDate: Date): CountdownTime => {
    const now = new Date()
    const diffMs = targetDate.getTime() - now.getTime()
    if (diffMs <= 0) return null

    const hours = Math.floor(diffMs / (1000 * 60 * 60))
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))
    const seconds = Math.floor((diffMs % (1000 * 60)) / 1000)

    return { hours, minutes, seconds }
  }, [])

  // Setup countdown timer for specific dates
  useEffect(() => {
    // Handle both ban end and grace period end countdowns
    const setupCountdown = (
      targetDate: Date,
      setStateFunction: React.Dispatch<React.SetStateAction<CountdownTime>>,
    ) => {
      // Check if today is the target date
      if (isSameMonthAndDay(currentDate, targetDate) && currentDate < targetDate) {
        // Initial calculation
        setStateFunction(calculateTimeRemaining(targetDate))

        // Setup interval for updates
        const intervalId = setInterval(() => {
          const remaining = calculateTimeRemaining(targetDate)
          setStateFunction(remaining)

          if (!remaining) {
            clearInterval(intervalId)
          }
        }, 1000) // Update every second instead of every minute

        return intervalId
      }
      return null
    }

    // Setup both countdowns
    const banEndIntervalId = setupCountdown(BAN_END_DATE, setBanEndTimeRemaining)
    const gracePeriodEndIntervalId = setupCountdown(
      effectiveGracePeriodEnd,
      setGracePeriodEndTimeRemaining,
    )

    // Cleanup function
    return () => {
      if (banEndIntervalId) clearInterval(banEndIntervalId)
      if (gracePeriodEndIntervalId) clearInterval(gracePeriodEndIntervalId)
    }
  }, [
    currentDate,
    BAN_END_DATE,
    effectiveGracePeriodEnd,
    isSameMonthAndDay,
    calculateTimeRemaining,
  ])

  // Don't show any banner if dismissed
  if (dismissed) {
    return null
  }

  // Check if it's within the crypto announcement period (7 days before to 7 days after)
  const cryptoStartDate = new Date(CRYPTO_ANNOUNCEMENT_DATE)
  cryptoStartDate.setDate(cryptoStartDate.getDate() - 7)
  const cryptoEndDate = new Date(CRYPTO_ANNOUNCEMENT_DATE)
  cryptoEndDate.setDate(cryptoEndDate.getDate() + 7)

  // Prioritize crypto banner during its announcement period
  if (currentDate >= cryptoStartDate && currentDate <= cryptoEndDate) {
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
            className='aspect-577/310 w-[36.0625rem] bg-gradient-to-r from-blue-600 to-teal-500 opacity-40'
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
            className='aspect-577/310 w-[36.0625rem] bg-gradient-to-r from-blue-600 to-teal-500 opacity-40'
          />
        </div>
        <p className='text-sm/6 text-gray-100 my-0!'>
          New! Pay for Dotabod Pro with cryptocurrency.{' '}
          <Link
            href='/blog/crypto-payments-launch'
            className='font-semibold whitespace-nowrap text-teal-300 hover:text-teal-200'
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

  // Show countdown banner on ban end date
  if (
    isSameMonthAndDay(currentDate, BAN_END_DATE) &&
    currentDate < BAN_END_DATE &&
    banEndTimeRemaining
  ) {
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
            className='aspect-577/310 w-[36.0625rem] bg-gradient-to-r from-red-600 to-orange-700 opacity-40'
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
            className='aspect-577/310 w-[36.0625rem] bg-gradient-to-r from-red-600 to-orange-700 opacity-40'
          />
        </div>
        <p className='text-sm/6 text-gray-100 my-0!'>
          Dotabod service will be restored today! Just{' '}
          <span className='font-semibold text-orange-300'>
            {banEndTimeRemaining.hours > 0
              ? `${banEndTimeRemaining.hours}h ${
                  banEndTimeRemaining.minutes > 0
                    ? `${banEndTimeRemaining.minutes}m`
                    : `${banEndTimeRemaining.seconds}s`
                }`
              : `${banEndTimeRemaining.minutes}m ${banEndTimeRemaining.seconds}s`}
          </span>{' '}
          remaining.{' '}
          <Link
            href='/blog/dotabod-banned'
            className='font-semibold whitespace-nowrap text-orange-300 hover:text-orange-200'
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

  // Show ban banner until ban end date (excluding the ban end date which uses the countdown)
  if (currentDate < BAN_END_DATE && !isSameMonthAndDay(currentDate, BAN_END_DATE)) {
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
            className='aspect-577/310 w-[36.0625rem] bg-gradient-to-r from-red-600 to-orange-700 opacity-40'
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
            className='aspect-577/310 w-[36.0625rem] bg-gradient-to-r from-red-600 to-orange-700 opacity-40'
          />
        </div>
        <p className='text-sm/6 text-gray-100 my-0!'>
          Dotabod is experiencing a temporary service disruption until April 6.{' '}
          <Link
            href='/blog/dotabod-banned'
            className='font-semibold whitespace-nowrap text-orange-300 hover:text-orange-200'
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

  // Show countdown for pricing plans on grace period end date
  if (
    isSameMonthAndDay(currentDate, effectiveGracePeriodEnd) &&
    currentDate < effectiveGracePeriodEnd &&
    gracePeriodEndTimeRemaining
  ) {
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
          New Pricing Plans launch today! Just{' '}
          <span className='font-semibold text-indigo-300'>
            {gracePeriodEndTimeRemaining.hours > 0
              ? `${gracePeriodEndTimeRemaining.hours}h ${
                  gracePeriodEndTimeRemaining.minutes > 0
                    ? `${gracePeriodEndTimeRemaining.minutes}m`
                    : `${gracePeriodEndTimeRemaining.seconds}s`
                }`
              : `${gracePeriodEndTimeRemaining.minutes}m ${gracePeriodEndTimeRemaining.seconds}s`}
          </span>{' '}
          remaining on current plans.{' '}
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

  // Show pricing banner after ban ends, but only until grace period end (excluding grace period end date which uses countdown)
  if (
    currentDate < effectiveGracePeriodEnd &&
    !isSameMonthAndDay(currentDate, effectiveGracePeriodEnd)
  ) {
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

  // Don't show any banner after grace period ends
  if (currentDate > effectiveGracePeriodEnd) {
    return null
  }

  // Don't show any banner after grace period ends
  return null
}
