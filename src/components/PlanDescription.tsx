import { SubscriptionStatus } from '@prisma/client'
import { useEffect, useState } from 'react'
import { useSubscriptionContext } from '@/contexts/SubscriptionContext'
import {
  GRACE_PERIOD_END,
  gracePeriodPrettyDate,
  isInGracePeriod,
  SUBSCRIPTION_TIERS,
} from '@/utils/subscription'
import ErrorBoundary from './ErrorBoundary'

interface PlanDescriptionProps {
  tier: string
  activePeriod: string
  payWithCrypto: boolean
  description: string
  hasCreditBalance: boolean
  formattedCreditBalance: string
  hasTrial: boolean
}

export const PlanDescription = ({
  tier,
  activePeriod,
  payWithCrypto,
  description,
  hasCreditBalance,
  formattedCreditBalance,
  hasTrial,
}: PlanDescriptionProps) => {
  const { subscription, hasActivePlan } = useSubscriptionContext()
  const [daysRemaining, setDaysRemaining] = useState<number | null>(null)
  const [messageType, setMessageType] = useState<string>('none')

  // Calculate days remaining and determine message type on client-side only
  useEffect(() => {
    // Calculate days remaining if in grace period
    if (isInGracePeriod()) {
      setDaysRemaining(Math.ceil((GRACE_PERIOD_END.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    }

    // Determine which message to show
    const showProContent = tier === SUBSCRIPTION_TIERS.PRO && activePeriod !== 'lifetime'

    // Determine message type
    let newMessageType = 'none'

    if (showProContent) {
      if (payWithCrypto) {
        newMessageType = 'crypto'
      } else if (hasCreditBalance && !hasActivePlan) {
        newMessageType = 'credit-checkout'
      } else if (hasActivePlan && hasCreditBalance) {
        newMessageType = 'credit-invoice'
      } else if (
        isInGracePeriod() &&
        (!subscription || subscription.status !== SubscriptionStatus.ACTIVE)
      ) {
        newMessageType = 'grace-period'
      } else if (hasTrial && (!subscription || subscription.status !== SubscriptionStatus.ACTIVE)) {
        newMessageType = 'trial'
      }
    }

    setMessageType(newMessageType)
  }, [tier, activePeriod, payWithCrypto, hasCreditBalance, hasActivePlan, hasTrial, subscription])

  return (
    <ErrorBoundary>
      <div className='plan-description'>
        <span>{description}</span>

        {/* Always render a message container, but only show content based on messageType */}
        <div className='additional-message'>
          {messageType === 'crypto' && (
            <span className='block mt-1 text-amber-400 transition-all duration-300 ease-in-out transform translate-y-0 opacity-100'>
              Note: Free trial is not available with crypto payments
            </span>
          )}

          {messageType === 'credit-checkout' && (
            <span className='block mt-1 text-purple-400 transition-all duration-300 ease-in-out'>
              You have {formattedCreditBalance} credit that will be applied at checkout
            </span>
          )}

          {messageType === 'credit-invoice' && (
            <span className='block mt-1 text-purple-400 transition-all duration-300 ease-in-out'>
              You have {formattedCreditBalance} credit that will be applied to your next invoice
            </span>
          )}

          {messageType === 'grace-period' && (
            <span className='block mt-1 text-purple-400 transition-all duration-300 ease-in-out transform translate-y-0 opacity-100'>
              Includes free trial until {gracePeriodPrettyDate}{' '}
              {daysRemaining !== null && `(${daysRemaining} days)`}
            </span>
          )}

          {messageType === 'trial' && (
            <span className='block mt-1 text-purple-400 transition-all duration-300 ease-in-out transform translate-y-0 opacity-100'>
              Includes 14-day free trial
            </span>
          )}
        </div>
      </div>
    </ErrorBoundary>
  )
}
