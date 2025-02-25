import { BillingPlans } from '@/components/Billing/BillingPlans'
import DashboardShell from '@/components/Dashboard/DashboardShell'
import Header from '@/components/Dashboard/Header'
import { useSubscription } from '@/hooks/useSubscription'
import {
  getCurrentPeriod,
  getSubscriptionStatusInfo,
  hasPaidPlan,
  isInGracePeriod,
  isSubscriptionActive,
} from '@/utils/subscription'
import { Alert, Button } from 'antd'
import { ExternalLinkIcon } from 'lucide-react'
import { useSession } from 'next-auth/react'
import Head from 'next/head'
import type { ReactElement } from 'react'
import { useState } from 'react'

const BillingPage = () => {
  const [isLoading, setIsLoading] = useState(false)
  const { subscription, isLoading: isLoadingSubscription } = useSubscription()
  const period = getCurrentPeriod(subscription?.stripePriceId)
  const { data: session } = useSession()
  const inGracePeriod = isInGracePeriod()
  const hasActivePlan = hasPaidPlan(subscription)
  const isLifetimePlan = subscription?.transactionType === 'LIFETIME'

  const handlePortalAccess = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/stripe/portal', {
        method: 'POST',
      })

      if (!response.ok) {
        throw new Error('Failed to create portal session')
      }

      const { url } = await response.json()
      window.location.href = url
    } catch (error) {
      console.error('Error accessing customer portal:', error)
    } finally {
      setIsLoading(false)
    }
  }

  if (session?.user?.isImpersonating) {
    return null
  }

  const statusInfo = getSubscriptionStatusInfo(
    subscription?.status,
    subscription?.cancelAtPeriodEnd,
    subscription?.currentPeriodEnd,
    subscription?.transactionType,
    subscription?.stripeSubscriptionId,
  )

  // Get appropriate subtitle based on subscription status
  const getSubtitle = () => {
    // If user has a lifetime subscription
    if (isLifetimePlan) {
      return `You have lifetime access to the ${
        subscription.tier.charAt(0).toUpperCase() + subscription.tier.slice(1)
      } plan`
    }

    // If user has a paid subscription
    if (hasActivePlan && subscription?.tier) {
      return `You are currently on the ${
        subscription.tier.charAt(0).toUpperCase() + subscription.tier.slice(1)
      } plan (${period})`
    }

    // If in grace period without paid subscription
    if (inGracePeriod && !hasActivePlan) {
      return 'You currently have free access to all Pro features until April 30, 2025'
    }

    // Default message
    return 'Manage your subscription and billing settings'
  }

  return (
    <>
      <Head>
        <title>Dotabod | Billing</title>
      </Head>

      {statusInfo?.message && (
        <Alert
          className='mt-6 max-w-2xl'
          message={statusInfo.message}
          type={statusInfo.type}
          showIcon
        />
      )}

      {/* Show additional alert for users with paid subscription during grace period */}
      {inGracePeriod && hasActivePlan && (
        <Alert
          className='mt-2 max-w-2xl'
          message="All users have free Pro access until April 30, 2025, but you're already subscribed. Thank you for your support!"
          type='success'
          showIcon
        />
      )}

      <Header
        title='Billing'
        subtitle={subscription ? getSubtitle() : 'Manage your subscription and billing settings'}
      />

      {/* Only show manage subscription button for recurring subscriptions with Stripe */}
      {isSubscriptionActive({ status: subscription?.status }) &&
        subscription?.stripeSubscriptionId &&
        !isLifetimePlan && (
          <div className='mt-6'>
            <Button
              type='primary'
              size='large'
              icon={<ExternalLinkIcon size={14} />}
              onClick={handlePortalAccess}
              disabled={isLoading}
            >
              {isLoading ? 'Loading...' : 'Manage your subscription'}
            </Button>
          </div>
        )}

      <div className='mt-12'>
        <BillingPlans subscription={subscription} showTitle={false} />
      </div>
    </>
  )
}

BillingPage.getLayout = function getLayout(page: ReactElement) {
  return <DashboardShell>{page}</DashboardShell>
}

export default BillingPage
