export async function createCheckoutSession(
  priceId: string,
  userId: string,
  paymentMethod?: string,
): Promise<{ url: string }> {
  const response = await fetch('/api/stripe/create-checkout', {
    body: JSON.stringify({ paymentMethod, priceId, userId }),
    headers: {
      'Content-Type': 'application/json',
    },
    method: 'POST',
  })

  if (!response.ok) {
    throw new Error('Failed to create checkout session')
  }

  return response.json()
}
