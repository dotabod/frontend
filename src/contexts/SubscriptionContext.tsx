import { useSubscription as useSubscriptionData } from '@/hooks/useSubscription'
import { type SubscriptionRow, hasPaidPlan, isInGracePeriod } from '@/utils/subscription'
import { type ReactNode, createContext, useContext } from 'react'

interface SubscriptionContextType {
  subscription: SubscriptionRow | null
  isLoading: boolean
  inGracePeriod: boolean
  hasActivePlan: boolean
  isLifetimePlan: boolean
  isPro: boolean
  isFree: boolean
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined)

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const { subscription, isLoading } = useSubscriptionData()
  const inGracePeriod = isInGracePeriod()
  const hasActivePlan = hasPaidPlan(subscription)
  const isLifetimePlan = subscription?.transactionType === 'LIFETIME'
  const isPro = subscription?.tier === 'PRO' || inGracePeriod
  const isFree = !isPro

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
