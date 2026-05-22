import { Container } from '@/components/Container'
import { BillingPlans } from './Billing/BillingPlans'

export function Pricing() {
  return (
    <section
      id='pricing'
      aria-labelledby='pricing-title'
      className='relative overflow-hidden border-t border-gray-800 bg-gray-950 py-[clamp(4rem,7vw,7rem)]'
    >
      {/* Faint purple wash: purple is signal, so it leans the eye toward the Pro card without going neon. */}
      <div
        aria-hidden
        className='pointer-events-none absolute inset-x-0 top-0 h-[28rem]'
        style={{
          background:
            'radial-gradient(55% 60% at 62% 0%, oklch(0.627 0.265 303.9 / 0.08), transparent 70%)',
        }}
      />
      <Container className='relative'>
        <BillingPlans />
      </Container>
    </section>
  )
}
