import DashboardShell from '@/components/Dashboard/DashboardShell'
import Header from '@/components/Dashboard/Header'
import { BillingPlans } from '@/components/Billing/BillingPlans'
import Head from 'next/head'
import type { ReactElement } from 'react'
import { useState, useEffect } from 'react'
import type { SubscriptionStatus } from '@/utils/subscription'

const BillingPage = () => {
  const [subscription, setSubscription] = useState<SubscriptionStatus | null>(
    null
  )

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

  return (
    <>
      <Head>
        <title>Dotabod | Billing</title>
      </Head>
      <Header subtitle="Manage your billing information." title="Billing" />
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
