import { Button, Skeleton } from 'antd'
import clsx from 'clsx'
import { ExternalLinkIcon } from 'lucide-react'
import { useSubscriptionContext } from '@/contexts/SubscriptionContext'
import { Card } from '@/ui/card'
import { getBillingSummaryInfo } from '@/utils/subscription'

const toneClasses = {
  success: 'border-emerald-800 bg-emerald-950/40 text-emerald-200',
  info: 'border-indigo-800 bg-indigo-950/40 text-indigo-200',
  warning: 'border-amber-800 bg-amber-950/40 text-amber-200',
  error: 'border-red-800 bg-red-950/40 text-red-200',
}

interface BillingOverviewProps {
  isLoading: boolean
  onOpenPortal: () => Promise<void>
}

export function BillingOverview({ isLoading, onOpenPortal }: BillingOverviewProps) {
  const {
    subscription,
    inGracePeriod,
    creditBalance,
    formattedCreditBalance,
    isLoading: isSubscriptionLoading,
  } = useSubscriptionContext()

  const summary = getBillingSummaryInfo({
    status: subscription?.status,
    cancelAtPeriodEnd: subscription?.cancelAtPeriodEnd,
    currentPeriodEnd: subscription?.currentPeriodEnd,
    transactionType: subscription?.transactionType,
    stripeSubscriptionId: subscription?.stripeSubscriptionId,
    stripeCustomerId: subscription?.stripeCustomerId,
    stripePriceId: subscription?.stripePriceId,
    tier: subscription?.tier,
    inGracePeriod,
    creditBalance,
    formattedCreditBalance,
  })

  if (isSubscriptionLoading) {
    return (
      <Card>
        <Skeleton active paragraph={{ rows: 4 }} />
      </Card>
    )
  }

  return (
    <Card className='space-y-6'>
      <div className='flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between'>
        <div className='space-y-4'>
          <div className='flex flex-wrap items-center gap-2'>
            <span className='text-xs font-medium uppercase tracking-[0.2em] text-gray-500'>
              Current billing
            </span>
            <span
              className={clsx(
                'rounded-full border px-3 py-1 text-xs font-medium',
                toneClasses[summary.tone],
              )}
            >
              {summary.planLabel}
            </span>
            <span className='text-sm text-gray-400'>{summary.statusLabel}</span>
          </div>

          <div>
            <h2 className='text-2xl font-semibold text-gray-100'>{summary.headline}</h2>
            <p className='mt-2 max-w-3xl text-sm leading-6 text-gray-300'>{summary.description}</p>
          </div>
        </div>

        {summary.canManageInStripe && (
          <Button
            type='primary'
            icon={<ExternalLinkIcon size={14} />}
            onClick={onOpenPortal}
            disabled={isLoading}
          >
            {isLoading ? 'Opening Stripe...' : summary.portalButtonLabel}
          </Button>
        )}
      </div>

      <div className='grid gap-4 border-t border-gray-800 pt-4 md:grid-cols-2'>
        <div className='space-y-1'>
          <div className='text-xs font-medium uppercase tracking-[0.2em] text-gray-500'>
            What happens next
          </div>
          <div className='text-lg font-semibold text-gray-100'>{summary.nextStepValue}</div>
          <p className='text-sm text-gray-400'>{summary.nextStepLabel}</p>
        </div>

        <div className='space-y-1'>
          <div className='text-xs font-medium uppercase tracking-[0.2em] text-gray-500'>
            Billing portal
          </div>
          <div className='text-lg font-semibold text-gray-100'>{summary.portalSummaryLabel}</div>
          <p className='text-sm text-gray-400'>{summary.portalHelpText}</p>
        </div>
      </div>

      {summary.creditMessage && (
        <div className='rounded-lg border border-indigo-900 bg-indigo-950/30 px-4 py-3 text-sm text-indigo-200'>
          {summary.creditMessage}
        </div>
      )}

      <p className='text-sm text-gray-400'>Need a different plan? Compare the options below.</p>
    </Card>
  )
}
