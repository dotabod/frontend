export type CheckoutPricePeriod = 'annual' | 'lifetime' | 'monthly'

const CHECKOUT_PRICES: { id: string; period: CheckoutPricePeriod }[] = [
  { id: process.env.NEXT_PUBLIC_STRIPE_PRO_MONTHLY_PRICE_ID ?? '', period: 'monthly' },
  { id: process.env.NEXT_PUBLIC_STRIPE_PRO_ANNUAL_PRICE_ID ?? '', period: 'annual' },
  { id: process.env.NEXT_PUBLIC_STRIPE_PRO_LIFETIME_PRICE_ID ?? '', period: 'lifetime' },
]

export const getCheckoutPricePeriod = function getCheckoutPricePeriod(
  priceId: string,
): CheckoutPricePeriod | null {
  return CHECKOUT_PRICES.find((price) => price.id === priceId)?.period ?? null
}
