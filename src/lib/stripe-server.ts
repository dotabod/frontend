import Stripe from 'stripe'

let instance: Stripe | null = null

function getStripe(): Stripe {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('Missing STRIPE_SECRET_KEY environment variable')
  }
  if (!instance) {
    instance = new Stripe(process.env.STRIPE_SECRET_KEY, {
      typescript: true,
      apiVersion: '2025-03-31.basil',
    })
  }
  return instance
}

export const stripe = new Proxy({} as Stripe, {
  get(_target, prop, receiver) {
    return Reflect.get(getStripe(), prop, receiver)
  },
})
