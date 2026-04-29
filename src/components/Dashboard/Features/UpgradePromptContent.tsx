import type { SubscriptionTier } from '@prisma/client'
import { Button } from 'antd'
import clsx from 'clsx'
import { ArrowRightIcon, CrownIcon, SparklesIcon } from 'lucide-react'
import Link from 'next/link'
import { SUBSCRIPTION_TIERS } from '@/utils/subscription'

interface UpgradePromptContentProps {
  requiredTier: SubscriptionTier
  variant?: 'compact' | 'overlay'
}

function toTitleCase(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase()
}

function getUpgradeCopy(requiredTier: SubscriptionTier, variant: 'compact' | 'overlay') {
  const tierLabel = toTitleCase(requiredTier)

  if (requiredTier === SUBSCRIPTION_TIERS.PRO) {
    return {
      eyebrow: 'Pro feature',
      title: 'Unlock Pro for your stream',
      description:
        variant === 'compact'
          ? 'Upgrade to Dotabod Pro to turn this on and unlock premium overlays, automations, and smarter stream controls.'
          : 'Upgrade to Dotabod Pro to turn this on and unlock premium overlays, automations, and the most polished stream setup in minutes.',
      highlights: ['Instant access', 'Premium overlays'],
      ctaLabel: 'See Pro plans',
      tierLabel,
    }
  }

  return {
    eyebrow: `${tierLabel} feature`,
    title: `Unlock ${tierLabel}`,
    description:
      variant === 'compact'
        ? `Upgrade your Dotabod plan to enable this ${tierLabel.toLowerCase()} feature for your stream.`
        : `Upgrade your Dotabod plan to enable this ${tierLabel.toLowerCase()} feature and keep your stream setup moving.`,
    highlights: ['Upgrade anytime', 'Instant access'],
    ctaLabel: `Upgrade to ${tierLabel}`,
    tierLabel,
  }
}

export function UpgradePromptContent({
  requiredTier,
  variant = 'compact',
}: UpgradePromptContentProps) {
  const copy = getUpgradeCopy(requiredTier, variant)

  return (
    <div
      className={clsx(
        'relative overflow-hidden border border-purple-500/30 bg-gray-950/95 text-gray-100 shadow-2xl shadow-purple-950/40 backdrop-blur-xl',
        variant === 'compact' ? 'w-[320px] rounded-2xl p-4' : 'w-full rounded-[24px] p-4 sm:p-6',
      )}
    >
      <div className='pointer-events-none absolute inset-0 bg-linear-to-br from-purple-500/12 via-transparent to-amber-300/10' />

      <div
        className={clsx(
          'relative flex flex-col',
          variant === 'compact' ? 'gap-5' : 'gap-4 sm:gap-5',
        )}
      >
        <div className='flex items-start gap-3'>
          <div className='flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-amber-300/20 bg-linear-to-br from-amber-400/20 via-purple-500/25 to-purple-700/20 text-amber-300 shadow-lg shadow-purple-950/30'>
            <CrownIcon className='h-5 w-5' />
          </div>

          <div className='min-w-0'>
            <div className='flex flex-wrap items-center gap-2'>
              <span className='text-[11px] font-semibold uppercase tracking-[0.24em] text-amber-300/90'>
                {copy.eyebrow}
              </span>
              <span className='inline-flex items-center gap-1 rounded-full border border-purple-400/25 bg-purple-500/10 px-2.5 py-1 text-[11px] font-medium text-purple-200'>
                <SparklesIcon className='h-3.5 w-3.5' />
                Premium unlock
              </span>
            </div>

            <h3
              className={clsx(
                'mt-2 font-semibold tracking-tight text-white',
                variant === 'compact' ? 'text-lg' : 'text-xl sm:text-[1.65rem]',
              )}
            >
              {copy.title}
            </h3>

            <p
              className={clsx(
                'mt-2 text-gray-300',
                variant === 'compact'
                  ? 'text-sm leading-6'
                  : 'text-sm leading-6 sm:text-base sm:leading-7',
              )}
            >
              {copy.description}
            </p>
          </div>
        </div>

        <div className='flex flex-wrap gap-2'>
          {copy.highlights.map((highlight) => (
            <span
              key={highlight}
              className='rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-medium text-gray-200 sm:text-xs'
            >
              {highlight}
            </span>
          ))}
        </div>

        <Link href='/dashboard/billing' className='w-full'>
          <Button
            type='primary'
            size={variant === 'compact' ? 'middle' : 'large'}
            className={clsx(
              'w-full border-0 bg-purple-500 font-semibold text-gray-950 shadow-lg shadow-purple-950/40 transition-all duration-200 hover:!bg-purple-400 hover:shadow-purple-900/60',
              variant === 'compact'
                ? 'h-11 rounded-xl'
                : 'h-11 rounded-xl text-sm sm:h-12 sm:rounded-2xl sm:text-base',
            )}
          >
            <span className='inline-flex items-center gap-2'>
              {copy.ctaLabel}
              <ArrowRightIcon className='h-4 w-4' />
            </span>
          </Button>
        </Link>
      </div>
    </div>
  )
}
