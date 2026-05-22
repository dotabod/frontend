export async function createCheckoutSession(
  priceId: string,
  userId: string,
  paymentMethod?: string,
): Promise<{ url: string }> {
  // PayPal is fully decoupled from Stripe and has its own endpoint that does not
  // load the Stripe SDK or require Stripe credentials.
  const endpoint =
    paymentMethod === 'paypal' ? '/api/paypal/create-checkout' : '/api/stripe/create-checkout'
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ priceId, userId, paymentMethod }),
  })

  if (!response.ok) {
    throw new Error('Failed to create checkout session')
  }

  return response.json()
}
