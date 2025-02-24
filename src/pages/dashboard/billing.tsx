import { BillingPlans } from '@/components/Billing/BillingPlans'
import DashboardShell from '@/components/Dashboard/DashboardShell'
import Header from '@/components/Dashboard/Header'
import { useSubscription } from '@/hooks/useSubscription'
import {
  getCurrentPeriod,
  getSubscriptionStatusInfo,
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
  )

  return (
    <>
      <Head>
        <title>Dotabod | Billing</title>
      </Head>

      <Header
        title='Billing'
        subtitle={
          subscription
            ? `You are currently on the ${
                subscription.tier.charAt(0).toUpperCase() + subscription.tier.slice(1)
              } plan (${period})`
            : 'Manage your subscription and billing settings'
        }
      />

      {statusInfo?.message && subscription?.status && (
        <Alert className='mt-6' message={statusInfo.message} type={statusInfo.type} showIcon />
      )}

      {isSubscriptionActive({ status: subscription?.status }) && (
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
