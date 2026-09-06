export interface GiftPriceInfo {
  annual: string
  lifetime: string
}

export type GiftDuration = 'annual' | 'lifetime' | 'monthly'
type GiftTextField = 'message' | 'senderName'

interface GiftText {
  giftMessage?: string
  giftSenderName?: string
}

export const getGiftDuration = (
  priceId: string,
  giftPriceInfo: GiftPriceInfo | undefined,
): GiftDuration => {
  if (priceId === giftPriceInfo?.lifetime) {
    return 'lifetime'
  }

  if (priceId === giftPriceInfo?.annual) {
    return 'annual'
  }

  return 'monthly'
}

export const getGiftTextValidationError = (
  { giftMessage, giftSenderName }: GiftText,
  isProfane: (text: string) => boolean,
): GiftTextField | undefined => {
  if (giftMessage !== undefined && giftMessage !== '' && isProfane(giftMessage)) {
    return 'message'
  }

  if (giftSenderName !== undefined && giftSenderName !== '' && isProfane(giftSenderName)) {
    return 'senderName'
  }

  return undefined
}
