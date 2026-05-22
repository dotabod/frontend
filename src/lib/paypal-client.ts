// Client helper for starting a PayPal checkout. PayPal is decoupled from Stripe
// and only needs the billing period — no Stripe price ID involved.
export async function createPaypalCheckout(period: string): Promise<{ url: string }> {
  const response = await fetch('/api/paypal/create-checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ period }),
  })

  if (!response.ok) {
    throw new Error('Failed to create checkout session')
  }

  return response.json()
}
