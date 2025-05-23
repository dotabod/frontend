import clsx from 'clsx'
import { forwardRef } from 'react'

export function AppScreen({ children, className, ...props }) {
  return (
    <div className={clsx('flex flex-col', className)} {...props}>
      {children}
    </div>
  )
}

AppScreen.Header = forwardRef<HTMLDivElement, { children: React.ReactNode }>(
  function AppScreenHeader({ children }, ref) {
    return (
      <div ref={ref} className='mt-6 px-4 text-white'>
        {children}
      </div>
    )
  },
)

AppScreen.Title = forwardRef<HTMLDivElement, { children: React.ReactNode }>(function AppScreenTitle(
  { children },
  ref,
) {
  return (
    <div ref={ref} className='text-2xl text-white'>
      {children}
    </div>
  )
})

AppScreen.Subtitle = forwardRef<HTMLDivElement, { children: React.ReactNode }>(
  function AppScreenSubtitle({ children }, ref) {
    return (
      <div ref={ref} className='text-sm text-gray-500'>
        {children}
      </div>
    )
  },
)

AppScreen.Body = forwardRef<HTMLDivElement, { children: React.ReactNode; className: string }>(
  function AppScreenBody({ children, className }, ref) {
    return (
      <div ref={ref} className={clsx('mt-6 flex-auto rounded-t-2xl bg-transparent', className)}>
        {children}
      </div>
    )
  },
)
