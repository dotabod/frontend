export type SubscriptionTier = 'free' | 'starter' | 'pro'
export type SubscriptionStatus = 'active' | 'inactive' | 'past_due' | 'canceled'

export interface SubscriptionInfo {
  tier: SubscriptionTier
  status: SubscriptionStatus
  currentPeriodEnd?: Date
  cancelAtPeriodEnd?: boolean
}

export interface SubscriptionPriceId {
  tier: SubscriptionTier
  monthly: string
  annual: string
}
