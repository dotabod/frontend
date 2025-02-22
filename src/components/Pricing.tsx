import { Container } from '@/components/Container'
import { useSubscription } from '@/hooks/useSubscription'
import { BillingPlans } from './Billing/BillingPlans'

export function Pricing() {
  const { subscription } = useSubscription()

  return (
    <section
      id='pricing'
      aria-labelledby='pricing-title'
      className='border-t border-gray-800 bg-gradient-to-b from-gray-900 to-black py-20 sm:py-32'
    >
      <Container>
        <BillingPlans subscription={subscription} />
      </Container>
    </section>
  )
}
