import type { SubscriptionTier } from '@prisma/client'
import { SUBSCRIPTION_TIERS } from '@/utils/subscription'
import { UpgradePromptContent } from './UpgradePromptContent'

interface LockedFeatureOverlayProps {
  requiredTier?: SubscriptionTier | null
  message?: React.ReactNode
}

function getOverlayMessage(requiredTier: SubscriptionTier) {
  if (requiredTier === SUBSCRIPTION_TIERS.PRO) {
    return 'This feature is part of Dotabod Pro.'
  }

  return `This feature unlocks with ${requiredTier.toLowerCase()}.`
}

export function LockedFeatureOverlay({ requiredTier, message }: LockedFeatureOverlayProps) {
  if (!requiredTier || requiredTier === SUBSCRIPTION_TIERS.FREE) {
    return null
  }

  return (
    <div className='absolute inset-0 z-10 overflow-hidden rounded-lg bg-black/72 backdrop-blur-lg'>
      <div className='flex h-full w-full items-center justify-center p-2 sm:p-3'>
        <div className='relative flex max-h-full w-full items-center justify-center overflow-auto rounded-[24px] border border-white/10 bg-gray-950/72 p-3 shadow-2xl shadow-black/50 sm:p-4'>
          <div className='pointer-events-none absolute inset-0 bg-linear-to-br from-purple-500/10 via-transparent to-amber-400/10' />

          <div className='relative flex w-full max-w-lg flex-col gap-3 sm:gap-4'>
            <div className='px-1 text-center text-sm text-gray-300 sm:text-[15px]'>
              {message ?? <span>{getOverlayMessage(requiredTier)}</span>}
            </div>

            <div className='flex justify-center'>
              <UpgradePromptContent requiredTier={requiredTier} variant='overlay' />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
