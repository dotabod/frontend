import { BillingPlans } from '@/components/Billing/BillingPlans'
import DashboardShell from '@/components/Dashboard/DashboardShell'
import Header from '@/components/Dashboard/Header'
import { useSubscription } from '@/hooks/useSubscription'
import {
  getCurrentPeriod,
  getSubscriptionStatusInfo,
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
  const hasPaidSubscription = subscription?.stripeSubscriptionId !== null

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

      {statusInfo?.message && (
        <Alert
          className='mt-6 max-w-2xl'
          message={statusInfo.message}
          type={statusInfo.type}
          showIcon
        />
      )}

      <Header
        title='Billing'
        subtitle={
          inGracePeriod && !hasPaidSubscription
            ? 'You currently have free access to all Pro features until April 30, 2025'
            : subscription
              ? `You are currently on the ${
                  subscription.tier.charAt(0).toUpperCase() + subscription.tier.slice(1)
                } plan (${period})`
              : 'Manage your subscription and billing settings'
        }
      />

      {isSubscriptionActive({ status: subscription?.status }) && hasPaidSubscription && (
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
