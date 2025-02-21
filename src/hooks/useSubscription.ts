import { useQuery } from '@tanstack/react-query'
import { useSession } from 'next-auth/react'
import type { SubscriptionStatus } from '@/utils/subscription'
async function fetchSubscription(userId: string): Promise<SubscriptionStatus> {
  const response = await fetch(`/api/subscriptions/${userId}`)
  if (!response.ok) {
    throw new Error('Failed to fetch subscription status')
  }
  return response.json()
}

export function useSubscription() {
  const { data: session } = useSession()
  const userId = session?.user?.id

  const { data: subscription, isLoading } = useQuery({
    queryKey: ['subscription', userId],
    queryFn: () => fetchSubscription(userId!),
    enabled: !!userId,
  })

  return {
    subscription,
    isLoading,
    isSubscribed: subscription?.status === 'active',
  }
}

export function useFeatureAccess(feature: string) {
  const { subscription, isLoading } = useSubscription()
  const { canAccessFeature } = require('@/utils/subscription')

  return {
    hasAccess: canAccessFeature(feature, subscription),
    isLoading,
  }
}
