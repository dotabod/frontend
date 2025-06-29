import { useSession } from 'next-auth/react'
import { useEffect, useState } from 'react'
import { useSubscriptionContext } from '@/contexts/SubscriptionContext'
import { getCurrentPeriod } from '@/utils/subscription'

// Define a type for credit balance
interface CreditBalance {
  amount: number
  formattedAmount: string
}

function SubscriptionStatusComponent() {
  const {
    subscription: rawSubscription,
    inGracePeriod,
    hasActivePlan,
    isLifetimePlan,
  } = useSubscriptionContext()
  const subscription = rawSubscription
  const { data: session } = useSession()
  const [creditBalance, setCreditBalance] = useState<CreditBalance>({
    amount: 0,
    formattedAmount: '$0.00',
  })

  const period = getCurrentPeriod(subscription?.stripePriceId)

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

  // Get appropriate subtitle based on subscription status
  const getSubtitle = () => {
    // If user has a lifetime subscription
    if (isLifetimePlan && subscription?.tier) {
      return `You have lifetime access to the ${
        subscription.tier.charAt(0).toUpperCase() + subscription.tier.slice(1).toLowerCase()
      } plan`
    }

    // If user has a paid subscription
    if (hasActivePlan && subscription?.tier) {
      // If they also have a credit balance
      if (creditBalance.amount > 0) {
        return `You are on the ${
          subscription.tier.charAt(0).toUpperCase() + subscription.tier.slice(1).toLowerCase()
        } plan (${period}) with a ${creditBalance.formattedAmount} credit balance`
      }

      return `You are currently on the ${
        subscription.tier.charAt(0).toUpperCase() + subscription.tier.slice(1).toLowerCase()
      } plan (${period})`
    }

    // If user has a credit balance but no active subscription
    if (creditBalance.amount > 0) {
      return `You have a ${creditBalance.formattedAmount} credit balance available - subscribe to a Pro plan to use it`
    }

    // If in grace period without paid subscription
    if (inGracePeriod && !hasActivePlan) {
      return 'Subscribe to Pro to continue using Dotabod Pro features after the free period ends.'
    }

    // If user has a subscription but it's not active
    if (subscription?.tier) {
      return 'You are currently on the Free plan'
    }

    // Default message for subscription management
    return 'Manage your subscription and billing settings'
  }

  return (
    <div className='flex flex-col gap-4'>
      <div className='text-base font-medium text-gray-300'>{getSubtitle()}</div>
    </div>
  )
}

// Export with the original name for backward compatibility
export const SubscriptionStatus = SubscriptionStatusComponent
