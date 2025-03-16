import type { JsonValue } from '@prisma/client/runtime/library'
import type { SubscriptionStatus, TransactionType } from '@prisma/client'
import type { SUBSCRIPTION_TIERS } from '@/utils/subscription'

// Shared gift subscription info type
export interface GiftInfo {
  hasGifts: boolean
  giftCount: number
  giftMessage: string
  proExpiration: Date | null
  hasLifetime: boolean
  giftSubscriptions?: Array<{
    id: string
    endDate: Date | null
    senderName: string
    giftType: string
    giftQuantity: number
    giftMessage: string
    createdAt: Date
  }>
}

// Shared status info type
export interface StatusInfo {
  message?: string
  type: 'success' | 'info' | 'warning' | 'error'
  badge: 'gold' | 'blue' | 'red' | 'default'
}

// Shared gift subscription details type
export interface GiftSubInfo {
  isGift?: boolean
  message?: string
  senderName?: string
  giftMessage?: string
  giftType?: string
  giftQuantity?: number
}

// Shared subscription with gift details type
export interface SubscriptionWithGiftDetails {
  id?: string
  userId?: string
  stripeCustomerId?: string | null
  stripePriceId?: string | null
  stripeSubscriptionId?: string | null
  tier?: (typeof SUBSCRIPTION_TIERS)[keyof typeof SUBSCRIPTION_TIERS]
  status?: SubscriptionStatus | null
  transactionType?: TransactionType | null
  currentPeriodEnd?: Date | null
  cancelAtPeriodEnd?: boolean
  isGift?: boolean
  metadata?: JsonValue
  giftDetails?: {
    senderName?: string | null
    giftType?: string | null
    giftQuantity?: number | null
    giftMessage?: string | null
  } | null
  isVirtual?: boolean
  isGracePeriodVirtual?: boolean
}
