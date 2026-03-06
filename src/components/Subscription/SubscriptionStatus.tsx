import { useSession } from 'next-auth/react'
import { useEffect, useState } from 'react'
import { useSubscriptionContext } from '@/contexts/SubscriptionContext'
import { getBillingSummaryInfo } from '@/utils/subscription'

// Define a type for credit balance
interface CreditBalance {
  amount: number
  formattedAmount: string
}

function SubscriptionStatusComponent() {
  const {
    subscription: rawSubscription,
    inGracePeriod,
    creditBalance: contextCreditBalance,
    formattedCreditBalance,
  } = useSubscriptionContext()
  const subscription = rawSubscription
  const { data: session } = useSession()
  const [creditBalance, setCreditBalance] = useState<CreditBalance>({
    amount: 0,
    formattedAmount: '$0.00',
  })

  // Fetch credit balance information when the component mounts
  useEffect(() => {
    if (!session?.user?.id) return

    const fetchCreditBalance = async () => {
      try {
        // This is a placeholder - replace with actual API call to fetch credit balance
        // For now, we'll simulate credit balance with metadata
        const creditBalanceAmount =
          subscription?.metadata && typeof subscription.metadata === 'object'
            ? Number((subscription.metadata as Record<string, unknown>).creditBalance || 0)
            : 0

        setCreditBalance({
          amount: creditBalanceAmount,
          formattedAmount: `$${(creditBalanceAmount / 100).toFixed(2)}`,
        })
      } catch (error) {
        console.error('Error fetching credit balance:', error)
      }
    }

    fetchCreditBalance()
  }, [session?.user?.id, subscription?.metadata])

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
    creditBalance: contextCreditBalance || creditBalance.amount,
    formattedCreditBalance:
      formattedCreditBalance !== '$0.00' ? formattedCreditBalance : creditBalance.formattedAmount,
  })

  const subtitle = summary.creditMessage
    ? `${summary.headline} ${summary.creditMessage}`
    : `${summary.headline} ${summary.nextStepLabel}: ${summary.nextStepValue}`

  return (
    <div className='flex flex-col gap-4'>
      <div className='text-base font-medium text-gray-300'>{subtitle}</div>
    </div>
  )
}

// Export with the original name for backward compatibility
export const SubscriptionStatus = SubscriptionStatusComponent
