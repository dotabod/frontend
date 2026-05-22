import { Button, Skeleton } from 'antd'
import clsx from 'clsx'
import { ExternalLinkIcon, GiftIcon } from 'lucide-react'
import { useSubscriptionContext } from '@/contexts/SubscriptionContext'
import { Card } from '@/ui/card'
import {
  getBillingSummaryInfo,
  isPaypalSubscription,
  isSubscriptionActive,
} from '@/utils/subscription'
import { BillingNotice } from './BillingNotice'

const chipClasses = {
  success: 'border-emerald-800 bg-emerald-950/40 text-emerald-200',
  info: 'border-indigo-800 bg-indigo-950/40 text-indigo-200',
  warning: 'border-amber-800 bg-amber-950/40 text-amber-200',
  error: 'border-red-800 bg-red-950/40 text-red-200',
}

const PAYPAL_AUTOPAY_URL = 'https://www.paypal.com/myaccount/autopay/'

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

  const isPayPal = isPaypalSubscription(subscription)

  if (isSubscriptionLoading) {
    return (
      <Card>
        <Skeleton active paragraph={{ rows: 4 }} />
      </Card>
    )
  }

  return (
    <Card className='space-y-5'>
      <div className='flex flex-wrap items-center gap-2'>
        <span className='text-xs font-medium uppercase tracking-[0.2em] text-gray-500'>
          Current plan
        </span>
        <span
          className={clsx(
            'rounded-full border px-3 py-1 text-xs font-medium',
            chipClasses[summary.tone],
          )}
        >
          {summary.planLabel}
        </span>
        <span className='text-sm text-gray-400'>{summary.statusLabel}</span>
      </div>

      <div>
        <h2 className='text-2xl font-semibold text-gray-100'>{summary.headline}</h2>
        <p className='mt-2 max-w-[68ch] text-sm leading-6 text-gray-300'>{summary.description}</p>
      </div>

      <div className='flex flex-col gap-4 border-t border-gray-800 pt-5 sm:flex-row sm:items-end sm:justify-between'>
        <div className='space-y-1'>
          <div className='text-xs font-medium uppercase tracking-[0.2em] text-gray-500'>
            {summary.nextStepLabel}
          </div>
          <div className='text-base font-medium text-gray-100'>{summary.nextStepValue}</div>
        </div>

        {isPayPal && isSubscriptionActive({ status: subscription?.status }) ? (
          <div className='sm:text-right'>
            <Button
              type='primary'
              icon={<ExternalLinkIcon size={14} />}
              href={PAYPAL_AUTOPAY_URL}
              target='_blank'
              rel='noopener noreferrer'
            >
              Manage PayPal subscription
            </Button>
            <p className='mt-2 max-w-xs text-xs leading-5 text-gray-500 sm:ml-auto'>
              You subscribed with PayPal. Update your payment method or cancel renewal from your
              PayPal account's automatic payments.
            </p>
          </div>
        ) : summary.canManageInStripe ? (
          <div className='sm:text-right'>
            <Button
              type='primary'
              icon={<ExternalLinkIcon size={14} />}
              onClick={onOpenPortal}
              disabled={isLoading}
            >
              {isLoading ? 'Opening Stripe…' : summary.portalButtonLabel}
            </Button>
            <p className='mt-2 max-w-xs text-xs leading-5 text-gray-500 sm:ml-auto'>
              {summary.portalHelpText}
            </p>
          </div>
        ) : (
          summary.portalHelpText && (
            <p className='max-w-xs text-xs leading-5 text-gray-500 sm:text-right'>
              {summary.portalHelpText}
            </p>
          )
        )}
      </div>

      {summary.creditMessage && (
        <BillingNotice tone='info' icon={<GiftIcon size={18} />} title='Account credit'>
          {summary.creditMessage}
        </BillingNotice>
      )}

      <p className='text-sm text-gray-400'>
        Want a different tier or billing period?{' '}
        <a href='#compare-plans' className='font-medium'>
          Compare plans
        </a>
        .
      </p>
    </Card>
  )
}
