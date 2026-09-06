const STRIPE_CHECKOUT_HOST = 'checkout.stripe.com'

export const getSafeStripeCheckoutUrl = (value: string): string | undefined => {
  try {
    const url = new URL(value)
    if (url.protocol !== 'https:' || url.host !== STRIPE_CHECKOUT_HOST) {
      return undefined
    }

    return url.href
  } catch {
    return undefined
  }
}
