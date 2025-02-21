import DashboardShell from '@/components/Dashboard/DashboardShell'
import Header from '@/components/Dashboard/Header'
import { BillingPlans } from '@/components/Billing/BillingPlans'
import Head from 'next/head'
import type { ReactElement } from 'react'
import { useState } from 'react'
import { isSubscriptionActive, getCurrentPeriod } from '@/utils/subscription'
import { Button } from 'antd'
import { useSubscription } from '@/hooks/useSubscription'

const BillingPage = () => {
  const [isLoading, setIsLoading] = useState(false)
  const { subscription, isLoading: isLoadingSubscription } = useSubscription()
  const period = getCurrentPeriod(subscription?.stripePriceId)

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

  return (
    <>
      <Head>
        <title>Dotabod | Billing</title>
      </Head>
      <Header subtitle="Manage your billing information." title="Billing" />

      {subscription && subscription.status === 'active' && (
        <p>
          You are currently on the{' '}
          {subscription.tier.charAt(0).toUpperCase() +
            subscription.tier.slice(1)}{' '}
          plan ({period})
        </p>
      )}

      {isSubscriptionActive(subscription) && (
        <div className="mt-6">
          <Button onClick={handlePortalAccess} disabled={isLoading}>
            {isLoading ? 'Loading...' : 'Manage Subscription'}
          </Button>
        </div>
      )}

      <div className="mt-12">
        <BillingPlans subscription={subscription} showTitle={false} />
      </div>
    </>
  )
}

BillingPage.getLayout = function getLayout(page: ReactElement) {
  return <DashboardShell>{page}</DashboardShell>
}

export default BillingPage
