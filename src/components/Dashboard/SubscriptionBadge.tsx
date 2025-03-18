import { useSubscriptionContext } from '@/contexts/SubscriptionContext'
import { Tooltip } from 'antd'
import { CrownIcon, Wallet } from 'lucide-react'
import { useRouter } from 'next/router'
import { useMemo } from 'react'

export const SubscriptionBadge = ({ collapsed }: { collapsed: boolean }) => {
  const router = useRouter()
  const { subscription, isLifetimePlan, hasActivePlan, inGracePeriod, isLoading } =
    useSubscriptionContext()

  // Don't show the badge on the billing page to avoid redundancy
  const isBillingPage = router.pathname.includes('/dashboard/billing')
  if (isBillingPage || isLoading) return null

  // Check if a credit balance exists
  const creditBalance = useMemo(() => {
    if (!subscription?.metadata || typeof subscription.metadata !== 'object') return 0
    return Number((subscription.metadata as Record<string, unknown>).creditBalance || 0)
  }, [subscription?.metadata])

  // Get the appropriate subscription badge based on subscription type
  const getSubscriptionBadge = () => {
    // Priority order: Lifetime > Credit Balance > Pro > Grace Period
    if (subscription?.transactionType === 'LIFETIME') {
      return {
        icon: <CrownIcon size={14} className='inline-block flex-shrink-0' />,
        text: 'Lifetime Pro',
        color: 'black',
        tooltip: 'Lifetime Pro Subscriber',
      }
    }

    // If user has a regular subscription and credit balance
    if (hasActivePlan && creditBalance > 0) {
      return {
        icon: (
          <div className='relative'>
            <CrownIcon size={14} className='inline-block flex-shrink-0' />
            <Wallet size={10} className='absolute -top-1 -right-2 text-amber-400' />
          </div>
        ),
        text: 'Pro + Credit',
        color: 'gold',
        tooltip: 'Pro Subscriber with Credit Balance',
      }
    }

    if (hasActivePlan) {
      return {
        icon: <CrownIcon size={14} className='inline-block flex-shrink-0' />,
        text: 'Pro',
        color: 'gold',
        tooltip: 'Pro Subscriber',
      }
    }

    if (creditBalance > 0) {
      return {
        icon: <Wallet size={14} className='inline-block flex-shrink-0' />,
        text: 'Credit Balance',
        color: 'green',
        tooltip: 'Credit balance available - subscribe to use it',
      }
    }

    if (inGracePeriod) {
      return {
        icon: <CrownIcon size={14} className='inline-block flex-shrink-0' />,
        text: 'Free Trial',
        color: 'blue',
        tooltip: 'Using Pro features during free trial period',
      }
    }

    return null
  }

  const badge = getSubscriptionBadge()
  if (!badge) return null

  return (
    <Tooltip title={badge.tooltip} placement={collapsed ? 'right' : 'top'}>
      <div
        className={`flex items-center gap-1.5 rounded px-2 py-1 text-xs font-medium ${
          collapsed ? 'justify-center' : ''
        } ${
          badge.color === 'gold'
            ? 'bg-amber-900/30 text-amber-300'
            : badge.color === 'black'
              ? 'bg-gray-900 text-amber-300'
              : badge.color === 'blue'
                ? 'bg-blue-900/30 text-blue-300'
                : badge.color === 'green'
                  ? 'bg-emerald-900/30 text-emerald-300'
                  : 'bg-gray-800 text-gray-300'
        }`}
      >
        {badge.icon}
        {!collapsed && <span>{badge.text}</span>}
      </div>
    </Tooltip>
  )
}
