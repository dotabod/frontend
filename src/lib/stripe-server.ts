import Stripe from 'stripe'

let instance: Stripe | null = null

function getStripe(): Stripe {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('Missing STRIPE_SECRET_KEY environment variable')
  }
  if (!instance) {
    instance = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2025-03-31.basil',
      typescript: true,
    })
  }
  return instance
}

export const stripe = new Proxy({} as Stripe, {
  get(_target, prop) {
    const instance = getStripe()
    // Resolve against the real instance (receiver = instance) so accessor
    // Getters bind to it, and bind methods so a call through this Proxy keeps
    // `this` as the real Stripe instance (its resources use private # fields).
    const value = Reflect.get(instance, prop, instance)
    return typeof value === 'function' ? value.bind(instance) : value
  },
})
