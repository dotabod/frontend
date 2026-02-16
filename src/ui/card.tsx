import clsx from 'clsx'
import { AnimatePresence, motion } from 'framer-motion'
import { useState } from 'react'
import { LockedFeatureOverlay } from '@/components/Dashboard/Features/LockedFeatureOverlay'
import { TierBadge } from '@/components/Dashboard/Features/TierBadge'
import { useFeatureAccess } from '@/hooks/useSubscription'
import type { FeatureTier, GenericFeature } from '@/utils/subscription'

interface CardProps {
  title?: React.ReactNode
  feature?: FeatureTier | GenericFeature
  className?: string
  children?: React.ReactNode
}
interface FeatureWrapperProps extends React.HTMLAttributes<HTMLDivElement> {
  feature?: FeatureTier | GenericFeature
}

export function FeatureWrapper({ feature, children, className, ...props }: FeatureWrapperProps) {
  const [isHovered, setIsHovered] = useState(false)
  const { hasAccess, requiredTier } = useFeatureAccess(feature)

  return (
    // biome-ignore lint/a11y/useSemanticElements: Container with hover behavior for locked feature overlay
    <div
      role='button'
      tabIndex={0}
      className={clsx('relative', className)}
      onMouseEnter={() => !hasAccess && setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      {...props}
    >
      {children}
      <AnimatePresence>
        {!hasAccess && isHovered && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className='absolute inset-0'
          >
            <LockedFeatureOverlay requiredTier={requiredTier} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export function Card({ className, feature, title, children, ...props }: CardProps) {
  const { requiredTier } = useFeatureAccess(feature)

  return (
    <FeatureWrapper
      feature={feature}
      className={clsx(
        'duration-200',
        'rounded-lg border border-transparent bg-gray-900 p-5 text-sm text-gray-300 shadow-lg transition-all hover:border hover:border-gray-600 hover:shadow-gray-500/10',
        className,
      )}
      {...props}
    >
      {title && (
        <div className='title'>
          <h3>{title}</h3>
          {requiredTier && <TierBadge requiredTier={requiredTier} />}
        </div>
      )}
      {children}
    </FeatureWrapper>
  )
}

interface CardFooterProps extends React.HTMLAttributes<HTMLDivElement> {}

Card.Footer = function CardFooter({ className, children, ...props }: CardFooterProps) {
  return (
    <div className={clsx('block text-sm font-medium sm:rounded-b-lg', className)} {...props}>
      <div className='grid w-full border-t border-solid border-gray-700  pt-4' />
      {children}
    </div>
  )
}
