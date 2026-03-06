import type { SubscriptionStatus, SubscriptionTier, TransactionType } from '@prisma/client'
import type { JsonValue } from '@prisma/client/runtime/library'
import { message, Typography } from 'antd'
import Head from 'next/head'
import { useSession } from 'next-auth/react'
import type { ReactElement } from 'react'
import { useState } from 'react'
import { BillingOverview } from '@/components/Billing/BillingOverview'
import { BillingPlans } from '@/components/Billing/BillingPlans'
import { PaymentStatusAlert } from '@/components/Billing/PaymentStatusAlert'
import DashboardShell from '@/components/Dashboard/DashboardShell'
import Header from '@/components/Dashboard/Header'
import { SubscriptionAlerts } from '@/components/Subscription/SubscriptionAlerts'
import { useSubscriptionContext } from '@/contexts/SubscriptionContext'
import { requireDashboardAccess } from '@/lib/server/dashboardAccess'
import { getSubscriptionStatusInfo } from '@/utils/subscription'

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
  const { subscription: rawSubscription } = useSubscriptionContext()

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

      const payload = await response.json().catch(() => null)

      if (!response.ok) {
        if (payload?.code === 'NO_STRIPE_CUSTOMER') {
          message.info(
            payload?.guidance ||
              'No Stripe billing profile was found for your account. Contact support if charges continue.',
          )
          return
        }

        message.error(
          payload?.guidance ||
            payload?.error ||
            'Unable to open billing settings right now. Please try again.',
        )
        return
      }

      if (!payload?.url) {
        message.error('Billing portal URL was not returned. Please try again.')
        return
      }

      window.location.href = payload.url
    } catch (error) {
      console.error('Error accessing customer portal:', error)
      message.error('Unable to open billing settings right now. Please try again.')
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

      <Header
        title='Billing'
        subtitle='See your current subscription at a glance and jump into Stripe when you need to change billing details.'
      />

      <div className='space-y-6'>
        <PaymentStatusAlert />
        <BillingOverview isLoading={isLoading} onOpenPortal={handlePortalAccess} />
        <SubscriptionAlerts
          giftInfo={emptyGiftInfo}
          statusInfo={statusInfo}
          handlePortalAccess={handlePortalAccess}
          isLoading={isLoading}
          hideManageButton
        />
      </div>

      <div className='mt-6'>
        <Title level={4} className='mb-4'>
          Change plan
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

export const getServerSideProps = requireDashboardAccess()

export default BillingPage
