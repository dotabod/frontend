import { BillingPlans } from '@/components/Billing/BillingPlans'
import DashboardShell from '@/components/Dashboard/DashboardShell'
import Header from '@/components/Dashboard/Header'
import { SubscriptionAlerts } from '@/components/Subscription/SubscriptionAlerts'
import { useSubscriptionContext } from '@/contexts/SubscriptionContext'
import { getSubscriptionStatusInfo } from '@/utils/subscription'
import type { SubscriptionStatus, SubscriptionTier, TransactionType } from '@prisma/client'
import type { JsonValue } from '@prisma/client/runtime/library'
import { Typography } from 'antd'
import { useSession } from 'next-auth/react'
import Head from 'next/head'
import type { ReactElement } from 'react'
import { useState } from 'react'

const { Title } = Typography

// Define the subscription type with metadata for type safety
interface SubscriptionWithMetadata {
  id?: string
  userId?: string
  stripeCustomerId?: string | null
  stripePriceId?: string | null
  stripeSubscriptionId?: string | null
  tier?: SubscriptionTier
  status?: SubscriptionStatus | null
  transactionType?: TransactionType | null
  currentPeriodEnd?: Date | null
  cancelAtPeriodEnd?: boolean
  metadata?: JsonValue
}

const BillingPage = () => {
  const [isLoading, setIsLoading] = useState(false)
  const { data: session } = useSession()
  const {
    subscription: rawSubscription,
    creditBalance: contextCreditBalance,
    formattedCreditBalance,
  } = useSubscriptionContext()

  // Cast subscription to the type with metadata
  const subscription = rawSubscription as unknown as SubscriptionWithMetadata

  const statusInfo = getSubscriptionStatusInfo(
    subscription?.status,
    subscription?.cancelAtPeriodEnd,
    subscription?.currentPeriodEnd,
    subscription?.transactionType,
    subscription?.stripeSubscriptionId,
  )

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

  // Empty gift info to pass to SubscriptionAlerts (to maintain compatibility)
  const emptyGiftInfo = {
    hasGifts: false,
    giftCount: 0,
    giftMessage: '',
    hasLifetime: false,
  }

  return (
    <>
      <Head>
        <title>Dotabod | Billing</title>
      </Head>

      <Header title='Billing' subtitle='View and manage your Dotabod Pro plans' />

      <div>
        <SubscriptionAlerts
          giftInfo={emptyGiftInfo}
          statusInfo={statusInfo}
          handlePortalAccess={handlePortalAccess}
          isLoading={isLoading}
        />
      </div>

      <div className='mt-6'>
        <Title level={4} className='mb-4'>
          Available Plans
        </Title>
        <BillingPlans showTitle={false} />
      </div>
    </>
  )
}

BillingPage.getLayout = function getLayout(page: ReactElement) {
  return (
    <DashboardShell
      seo={{
        title: 'Billing | Dotabod Dashboard',
        description: 'Manage your Dotabod subscription and billing information.',
        canonicalUrl: 'https://dotabod.com/dashboard/billing',
        noindex: true,
      }}
    >
      {page}
    </DashboardShell>
  )
}

export default BillingPage
