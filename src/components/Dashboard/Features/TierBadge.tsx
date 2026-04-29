import type { SubscriptionTier } from '@prisma/client'
import { Popover } from 'antd'
import clsx from 'clsx'
import { CrownIcon } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useSubscription } from '@/hooks/useSubscription'
import {
  type FeatureTier,
  type GenericFeature,
  getRequiredTier,
  isSubscriptionActive,
  SUBSCRIPTION_TIERS,
} from '@/utils/subscription'
import { UpgradePromptContent } from './UpgradePromptContent'

export const TierBadge: React.FC<{
  requiredTier?: SubscriptionTier | null
  feature?: FeatureTier | GenericFeature
  tooltip?: boolean
}> = ({ requiredTier, feature, tooltip = true }) => {
  const { subscription } = useSubscription()
  const closeTimerRef = useRef<number | null>(null)
  const [isUpgradePopoverOpen, setIsUpgradePopoverOpen] = useState(false)
  const featureRequiredTier = getRequiredTier(feature)
  const tierToShow = feature ? featureRequiredTier : requiredTier
  const isUpgradeLocked = !isSubscriptionActive({ status: subscription?.status }) && tooltip

  const clearCloseTimer = useCallback(() => {
    if (closeTimerRef.current) {
      window.clearTimeout(closeTimerRef.current)
      closeTimerRef.current = null
    }
  }, [])

  const openUpgradePopover = useCallback(() => {
    if (!isUpgradeLocked) {
      return
    }

    clearCloseTimer()
    setIsUpgradePopoverOpen(true)
  }, [clearCloseTimer, isUpgradeLocked])

  const closeUpgradePopover = useCallback(() => {
    clearCloseTimer()
    setIsUpgradePopoverOpen(false)
  }, [clearCloseTimer])

  const scheduleUpgradePopoverClose = useCallback(() => {
    if (!isUpgradeLocked) {
      return
    }

    clearCloseTimer()
    closeTimerRef.current = window.setTimeout(() => {
      setIsUpgradePopoverOpen(false)
    }, 180)
  }, [clearCloseTimer, isUpgradeLocked])

  useEffect(() => {
    return () => {
      clearCloseTimer()
    }
  }, [clearCloseTimer])

  useEffect(() => {
    if (!isUpgradeLocked && isUpgradePopoverOpen) {
      closeUpgradePopover()
    }
  }, [closeUpgradePopover, isUpgradeLocked, isUpgradePopoverOpen])

  if (!tierToShow || tierToShow === SUBSCRIPTION_TIERS.FREE) {
    return null
  }

  const badgeContent = (
    <span
      className={clsx(
        'inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] shadow-sm transition-all duration-200',
        tierToShow === SUBSCRIPTION_TIERS.PRO
          ? 'border-amber-400/45 bg-linear-to-r from-amber-500/15 via-purple-500/10 to-purple-500/5 text-amber-200'
          : 'border-purple-400/35 bg-purple-500/10 text-purple-200',
        isUpgradeLocked &&
          'cursor-pointer hover:border-purple-300/60 hover:bg-purple-500/15 hover:text-white hover:shadow-lg hover:shadow-purple-950/30',
      )}
    >
      <span className='flex h-5 w-5 items-center justify-center rounded-full bg-black/20'>
        <CrownIcon className='h-3.5 w-3.5' />
      </span>
      <span>{tierToShow.toLowerCase()}</span>
    </span>
  )

  if (!isUpgradeLocked) {
    return badgeContent
  }

  return (
    <Popover
      content={
        <div
          role='dialog'
          tabIndex={-1}
          onMouseEnter={openUpgradePopover}
          onMouseLeave={scheduleUpgradePopoverClose}
          onFocus={openUpgradePopover}
          onBlur={(event) => {
            const relatedTarget = event.relatedTarget

            if (relatedTarget instanceof Node && event.currentTarget.contains(relatedTarget)) {
              return
            }

            scheduleUpgradePopoverClose()
          }}
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              closeUpgradePopover()
            }
          }}
        >
          <UpgradePromptContent requiredTier={tierToShow} />
        </div>
      }
      destroyOnHidden={false}
      open={isUpgradePopoverOpen}
      placement='top'
      showArrow={false}
      trigger={['click']}
      onOpenChange={(nextOpen) => {
        if (nextOpen) {
          openUpgradePopover()
          return
        }

        closeUpgradePopover()
      }}
      styles={{ body: { padding: 0 } }}
    >
      <button
        type='button'
        className='appearance-none border-0 bg-transparent p-0 text-left'
        aria-expanded={isUpgradePopoverOpen}
        aria-haspopup='dialog'
        aria-label={`Unlock ${tierToShow.toLowerCase()} features`}
        onClick={() => {
          clearCloseTimer()
          setIsUpgradePopoverOpen((currentValue) => !currentValue)
        }}
        onFocus={openUpgradePopover}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            closeUpgradePopover()
          }
        }}
        onMouseEnter={openUpgradePopover}
        onMouseLeave={scheduleUpgradePopoverClose}
      >
        {badgeContent}
      </button>
    </Popover>
  )
}
