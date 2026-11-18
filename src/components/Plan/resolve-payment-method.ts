import type { PaymentMethod } from './payment-method-picker'

// Card issuers in Russia are cut off from international processors, so Stripe
// Declines their cards at checkout and at every renewal.
export const isRussianLocale = function isRussianLocale(
  ...locales: (string | null | undefined)[]
): boolean {
  return locales.some((locale) => locale?.toLowerCase().split(/[-_]/u)[0] === 'ru')
}

export const resolvePaymentMethod = function resolvePaymentMethod({
  isProTier,
  userPicked,
  cryptoEnabled,
  paypalEnabled,
  paidWithCrypto,
  paidWithPaypal,
  cardsLikelyDeclined,
}: {
  isProTier: boolean
  userPicked: PaymentMethod | null
  cryptoEnabled: boolean
  paypalEnabled: boolean
  paidWithCrypto: boolean
  paidWithPaypal: boolean
  cardsLikelyDeclined: boolean
}): PaymentMethod {
  if (!isProTier) {
    return 'card'
  }
  if (userPicked === 'paypal' && paypalEnabled) {
    return 'paypal'
  }
  if (userPicked === 'crypto' && cryptoEnabled) {
    return 'crypto'
  }
  if (userPicked === 'card') {
    return 'card'
  }
  // No user pick (or user's pick is no longer enabled) — derive from subscription
  if (paypalEnabled && paidWithPaypal) {
    return 'paypal'
  }
  if (cryptoEnabled && paidWithCrypto) {
    return 'crypto'
  }
  if (cryptoEnabled && cardsLikelyDeclined) {
    return 'crypto'
  }
  return 'card'
}

// The sign-in callback URL carries crypto=true or paypal=true. It carries nothing for
// Card, so absence means card.
export const restoredPaymentMethod = function restoredPaymentMethod({
  crypto,
  paypal,
}: {
  crypto?: string | string[] | undefined
  paypal?: string | string[] | undefined
}): PaymentMethod {
  if (crypto === 'true') {
    return 'crypto'
  }
  if (paypal === 'true') {
    return 'paypal'
  }
  return 'card'
}
