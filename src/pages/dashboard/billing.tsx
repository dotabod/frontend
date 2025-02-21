import DashboardShell from '@/components/Dashboard/DashboardShell'
import Header from '@/components/Dashboard/Header'
import { BillingPlans } from '@/components/Billing/BillingPlans'
import Head from 'next/head'
import type { ReactElement } from 'react'
import { useState, useEffect } from 'react'
import {
  type SubscriptionStatus,
  isSubscriptionActive,
} from '@/utils/subscription'
import { Button } from 'antd'

const BillingPage = () => {
  const [subscription, setSubscription] = useState<SubscriptionStatus | null>(
    null
  )
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    async function getSubscription() {
      const response = await fetch('/api/stripe/subscription')
      if (response.ok) {
        const data = await response.json()
        setSubscription(data)
      }
    }

    getSubscription()
  }, [])

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

      {isSubscriptionActive(subscription) && (
        <div className="mt-6">
          <Button onClick={handlePortalAccess} disabled={isLoading}>
            {isLoading ? 'Loading...' : 'Manage Subscription'}
          </Button>
        </div>
      )}

      <div className="mt-12">
        <BillingPlans
          subscription={subscription}
          onSubscriptionUpdate={setSubscription}
          showTitle={false}
        />
      </div>
    </>
  )
}

BillingPage.getLayout = function getLayout(page: ReactElement) {
  return <DashboardShell>{page}</DashboardShell>
}

export default BillingPage
