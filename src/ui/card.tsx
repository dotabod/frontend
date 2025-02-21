import clsx from 'clsx'
import type { SubscriptionTier } from '@/utils/subscription'
import { useState } from 'react'
import { LockedFeatureOverlay } from '@/components/Dashboard/Features/LockedFeatureOverlay'
interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  requiredTier?: SubscriptionTier
}

export function Card({
  className,
  requiredTier,
  children,
  ...props
}: CardProps) {
  const [isHovered, setIsHovered] = useState(false)

  return (
    <div
      className={clsx(
        'rounded-lg border border-transparent bg-gray-900 p-5 text-sm text-gray-300 shadow-lg transition-all hover:border hover:border-gray-600 hover:shadow-gray-500/10',
        className
      )}
      onMouseEnter={() => requiredTier && setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      {...props}
    >
      {children}
      {requiredTier && isHovered && (
        <LockedFeatureOverlay requiredTier={requiredTier} />
      )}
    </div>
  )
}

interface CardFooterProps extends React.HTMLAttributes<HTMLDivElement> {}

Card.Footer = function CardFooter({
  className,
  children,
  ...props
}: CardFooterProps) {
  return (
    <div
      className={clsx('block text-sm font-medium sm:rounded-b-lg', className)}
      {...props}
    >
      <div className="grid w-full border-t border-solid border-gray-700  pt-4" />
      {children}
    </div>
  )
}
