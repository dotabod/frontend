export async function createCheckoutSession(
  priceId: string,
  userId: string,
  paymentMethod?: string,
): Promise<{ url: string }> {
  const response = await fetch('/api/stripe/create-checkout', {
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
