import { BillingPlans } from '@/components/Billing/BillingPlans'
import DashboardShell from '@/components/Dashboard/DashboardShell'
import Header from '@/components/Dashboard/Header'
import { SubscriptionStatus } from '@/components/Subscription/SubscriptionStatus'
import { useSubscriptionContext } from '@/contexts/SubscriptionContext'
import { isSubscriptionActive } from '@/utils/subscription'
import { Button } from 'antd'
import { ExternalLinkIcon } from 'lucide-react'
import { useSession } from 'next-auth/react'
import Head from 'next/head'
import type { ReactElement } from 'react'
import { useState } from 'react'

const BillingPage = () => {
  const [isLoading, setIsLoading] = useState(false)
  const { data: session } = useSession()
  const { subscription, isLifetimePlan } = useSubscriptionContext()

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

  return (
    <>
      <Head>
        <title>Dotabod | Billing</title>
      </Head>

      <Header title='Billing' subtitle='View and manage your Dotabod Pro plans' />

      <SubscriptionStatus />

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
        <BillingPlans showTitle={false} />
      </div>
    </>
  )
}

BillingPage.getLayout = function getLayout(page: ReactElement) {
  return <DashboardShell>{page}</DashboardShell>
}

export default BillingPage
