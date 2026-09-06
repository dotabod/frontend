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
  payWithPaypal: boolean
  description: string
  hasCreditBalance: boolean
  formattedCreditBalance: string
  hasTrial: boolean
}

export const PlanDescription = ({
  tier,
  activePeriod,
  payWithCrypto,
  payWithPaypal,
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
      } else if (payWithPaypal) {
        newMessageType = 'paypal'
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
  }, [
    tier,
    activePeriod,
    payWithCrypto,
    payWithPaypal,
    hasCreditBalance,
    hasActivePlan,
    hasTrial,
    subscription,
  ])

  return (
    <ErrorBoundary>
      <div className='plan-description'>
        <span>{description}</span>

        {/* Always render a message container, but only show content based on messageType */}
        <div className='additional-message'>
          {messageType === 'crypto' && (
            <span className='mt-1 block translate-y-0 transform text-amber-400 opacity-100 transition-all duration-300 ease-in-out'>
              Note: Free trial is not available with crypto payments
            </span>
          )}

          {messageType === 'paypal' && (
            <span className='mt-1 block translate-y-0 transform text-amber-400 opacity-100 transition-all duration-300 ease-in-out'>
              {hasCreditBalance
                ? `Note: PayPal checkout will not apply your ${formattedCreditBalance} account credit, and free trials are not available with PayPal.`
                : 'Note: Free trial is not available with PayPal payments'}
            </span>
          )}

          {messageType === 'credit-checkout' && (
            <span className='mt-1 block text-purple-400 transition-all duration-300 ease-in-out'>
              You have {formattedCreditBalance} credit that will be applied at checkout
            </span>
          )}

          {messageType === 'credit-invoice' && (
            <span className='mt-1 block text-purple-400 transition-all duration-300 ease-in-out'>
              You have {formattedCreditBalance} credit that will be applied to your next invoice
            </span>
          )}

          {messageType === 'grace-period' && (
            <span className='mt-1 block translate-y-0 transform text-purple-400 opacity-100 transition-all duration-300 ease-in-out'>
              Includes free trial until {gracePeriodPrettyDate}{' '}
              {daysRemaining !== null && `(${daysRemaining} days)`}
            </span>
          )}

          {messageType === 'trial' && (
            <span className='mt-1 block translate-y-0 transform text-purple-400 opacity-100 transition-all duration-300 ease-in-out'>
              Includes 14 day free trial
            </span>
          )}
        </div>
      </div>
    </ErrorBoundary>
  )
}
