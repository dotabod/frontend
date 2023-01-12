import { forwardRef } from 'react'
import clsx from 'clsx'

export function AppScreen({ children, className, ...props }) {
  return (
    <div className={clsx('flex flex-col', className)} {...props}>
      {children}
    </div>
  )
}

AppScreen.Header = forwardRef(function AppScreenHeader({ children }, ref) {
  return (
    <div ref={ref} className="mt-6 px-4 text-white">
      {children}
    </div>
  )
})

AppScreen.Title = forwardRef(function AppScreenTitle({ children }, ref) {
  return (
    <div ref={ref} className="text-2xl text-white">
      {children}
    </div>
  )
})

AppScreen.Subtitle = forwardRef(function AppScreenSubtitle({ children }, ref) {
  return (
    <div ref={ref} className="text-sm text-gray-500">
      {children}
    </div>
  )
})

AppScreen.Body = forwardRef(function AppScreenBody(
  { children, className },
  ref
) {
  return (
    <div
      ref={ref}
      className={clsx('mt-6 flex-auto rounded-t-2xl bg-white', className)}
    >
      {children}
    </div>
  )
})
