// Client helper for starting a PayPal checkout. PayPal is decoupled from Stripe
// And only needs the billing period — no Stripe price ID involved.
export async function createPaypalCheckout(period: string): Promise<{ url: string }> {
  const response = await fetch('/api/paypal/create-checkout', {
    body: JSON.stringify({ period }),
    headers: { 'Content-Type': 'application/json' },
    method: 'POST',
  })

  if (!response.ok) {
    throw new Error('Failed to create checkout session')
  }

  return response.json()
}
