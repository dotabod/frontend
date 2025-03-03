import { Container } from '@/components/Container'
import { BillingPlans } from './Billing/BillingPlans'

export function Pricing() {
  return (
    <section
      id='pricing'
      aria-labelledby='pricing-title'
      className='border-t border-gray-800 bg-linear-to-b from-gray-900 to-black py-20 sm:py-32'
    >
      <Container>
        <BillingPlans />
      </Container>
    </section>
  )
}
