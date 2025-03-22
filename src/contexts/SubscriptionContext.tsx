import { useSubscription as useSubscriptionData } from '@/hooks/useSubscription'
import { type SubscriptionRow, hasPaidPlan, isInGracePeriod } from '@/utils/subscription'
import { type ReactNode, createContext, useContext } from 'react'
import { fetcher } from '@/lib/fetcher'
import useSWR from 'swr'
import { useSession } from 'next-auth/react'

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
  // Fetch credit balance
  const { data: creditBalanceData } = useSWR(
    session?.user ? '/api/stripe/credit-balance' : null,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateIfStale: false,
      refreshInterval: 60000, // Refresh every minute
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
