import type {} from '@prisma/client'
import type {} from '@prisma/client/runtime/library'
import type {} from '@/utils/subscription'

// Shared gift subscription info type
export interface GiftInfo {
  hasGifts: boolean
  giftCount: number
  giftMessage: string
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
  message?: string
  senderName?: string
  giftMessage?: string
  giftType?: string
  giftQuantity?: number
}

// Shared subscription with gift details type
