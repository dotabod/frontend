import { useRouter } from 'next/router'
import { createContext, useContext } from 'react'
import type { ReactNode } from 'react'
import useSWR from 'swr'

import { useSubscription as useSubscriptionData } from '@/hooks/use-subscription'
import { fetcher } from '@/lib/fetcher'
import { SETTINGS_SWR_OPTIONS } from '@/lib/hooks/use-update-setting'
import { hasPaidPlan, isInGracePeriod } from '@/utils/subscription'
import type { SubscriptionRow } from '@/utils/subscription'

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

export const SubscriptionProvider = function SubscriptionProvider({
  children,
}: {
  children: ReactNode
}) {
  const router = useRouter()
  const { subscription, isLoading } = useSubscriptionData()
  const inGracePeriod = isInGracePeriod()
  const hasActivePlan = hasPaidPlan(subscription)
  const isLifetimePlan = subscription?.transactionType === 'LIFETIME'
  const isPro = subscription?.tier === 'PRO' || inGracePeriod
  const isFree = !isPro

  const creditBalanceKey =
    router.isReady && router.pathname.startsWith('/dashboard') ? '/api/stripe/credit-balance' : null
  // Fetch credit balance and specify the response type
  const { data: creditBalanceData } = useSWR<CreditBalanceResponse>(
    // Add type argument here
    creditBalanceKey,
    fetcher,
    SETTINGS_SWR_OPTIONS,
  )

  const formattedCreditBalance = creditBalanceData?.formatted || '$0.00'
  const creditBalance = creditBalanceData?.balance || 0

  return (
    <SubscriptionContext.Provider
      value={{
        creditBalance,
        formattedCreditBalance,
        hasActivePlan,
        inGracePeriod,
        isFree,
        isLifetimePlan,
        isLoading,
        isPro,
        subscription,
      }}
    >
      {children}
    </SubscriptionContext.Provider>
  )
}

export const useSubscriptionContext = function useSubscriptionContext() {
  const context = useContext(SubscriptionContext)
  if (context === undefined) {
    throw new Error('useSubscriptionContext must be used within a SubscriptionProvider')
  }
  return context
}
