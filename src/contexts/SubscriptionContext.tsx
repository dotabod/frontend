import { useSession } from 'next-auth/react'
import { createContext, type ReactNode, useContext } from 'react'
import useSWR from 'swr'
import { useSubscription as useSubscriptionData } from '@/hooks/useSubscription'
import { fetcher } from '@/lib/fetcher'
import { hasPaidPlan, isInGracePeriod, type SubscriptionRow } from '@/utils/subscription'

// Define the expected response shape for credit balance
interface CreditBalanceResponse {
  formatted: string
  balance: number
}

interface SubscriptionContextType {
  subscription: SubscriptionRow | null
  isLoading: boolean
  inGracePeriod: boolean
  hasActivePlan: boolean
  isLifetimePlan: boolean
  isPro: boolean
  isFree: boolean
  creditBalance: number
  formattedCreditBalance: string
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined)

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const { subscription, isLoading } = useSubscriptionData()
  const inGracePeriod = isInGracePeriod()
  const hasActivePlan = hasPaidPlan(subscription)
  const isLifetimePlan = subscription?.transactionType === 'LIFETIME'
  const isPro = subscription?.tier === 'PRO' || inGracePeriod
  const isFree = !isPro

  const { data: session } = useSession()
  const creditBalanceKey = session?.user ? '/api/stripe/credit-balance' : null
  // Fetch credit balance and specify the response type
  const { data: creditBalanceData } = useSWR<CreditBalanceResponse>(
    // Add type argument here
    creditBalanceKey,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateIfStale: false,
    },
  )

  const formattedCreditBalance = creditBalanceData?.formatted || '$0.00'
  const creditBalance = creditBalanceData?.balance || 0

  return (
    <SubscriptionContext.Provider
      value={{
        subscription,
        isLoading,
        inGracePeriod,
        hasActivePlan,
        isLifetimePlan,
        isPro,
        isFree,
        creditBalance,
        formattedCreditBalance,
      }}
    >
      {children}
    </SubscriptionContext.Provider>
  )
}

export function useSubscriptionContext() {
  const context = useContext(SubscriptionContext)
  if (context === undefined) {
    throw new Error('useSubscriptionContext must be used within a SubscriptionProvider')
  }
  return context
}
