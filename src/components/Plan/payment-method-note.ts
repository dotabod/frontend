import type { PricePeriod } from '@/utils/subscription'

import type { PaymentMethod } from './payment-method-picker'

const NOTES: Record<PaymentMethod, { lifetime: string; recurring: string }> = {
  card: {
    lifetime: 'One-time card payment.',
    recurring: 'Renews automatically. Cancel anytime.',
  },
  crypto: {
    lifetime: 'One-time payment in BTC, USDT, ETH, and 100+ other coins.',
    recurring: "You'll get an invoice each period to pay in BTC, USDT, ETH, and 100+ other coins.",
  },
  paypal: {
    lifetime: 'One-time payment through your PayPal account.',
    recurring: 'Renews automatically through your PayPal account.',
  },
}

export const noteFor = function noteFor(
  method: PaymentMethod,
  period: PricePeriod,
  warnCardDeclines: boolean,
): string {
  if (method === 'card' && warnCardDeclines) {
    return 'Cards issued in Russia are usually declined. Crypto payments go through.'
  }
  const notes = NOTES[method]
  return period === 'lifetime' ? notes.lifetime : notes.recurring
}
