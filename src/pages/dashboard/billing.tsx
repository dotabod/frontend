import { BillingPlans } from '@/components/Billing/BillingPlans'
import DashboardShell from '@/components/Dashboard/DashboardShell'
import Header from '@/components/Dashboard/Header'
import { SubscriptionAlerts } from '@/components/Subscription/SubscriptionAlerts'
import { useSubscriptionContext } from '@/contexts/SubscriptionContext'
import { fetchGiftSubscriptions } from '@/lib/gift-subscription'
import { getGiftSubscriptionInfo, getSubscriptionStatusInfo } from '@/utils/subscription'
import { Typography } from 'antd'
import { useSession } from 'next-auth/react'
import Head from 'next/head'
import type { ReactElement } from 'react'
import { useState, useEffect } from 'react'
import type { JsonValue } from '@prisma/client/runtime/library'
import type { SubscriptionStatus, SubscriptionTier, TransactionType } from '@prisma/client'

const { Title } = Typography

// Define the subscription type with giftDetails for type safety
interface SubscriptionWithGiftDetails {
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
  isGift?: boolean
  metadata?: JsonValue
  giftDetails?: {
    senderName?: string | null
    giftType?: string | null
    giftQuantity?: number | null
    giftMessage?: string | null
  } | null
}

const BillingPage = () => {
  const [isLoading, setIsLoading] = useState(false)
  const [giftInfo, setGiftInfo] = useState<{
    hasGifts: boolean
    giftCount: number
    giftMessage: string
    hasLifetime: boolean
    giftSubscriptions?: Array<{
      id: string
      endDate: Date | null
      senderName: string
      giftType: string
      giftQuantity: number
      giftMessage: string
      createdAt: Date
    }>
  }>({
    hasGifts: false,
    giftCount: 0,
    giftMessage: '',
    hasLifetime: false,
  })
  const { data: session } = useSession()
  const { subscription: rawSubscription } = useSubscriptionContext()

  // Cast subscription to the type with giftDetails
  const subscription = rawSubscription as unknown as SubscriptionWithGiftDetails

  const statusInfo = getSubscriptionStatusInfo(
    subscription?.status,
    subscription?.cancelAtPeriodEnd,
    subscription?.currentPeriodEnd,
    subscription?.transactionType,
    subscription?.stripeSubscriptionId,
    subscription?.isGift,
  )

  // Get gift subscription info if applicable
  const giftSubInfo = getGiftSubscriptionInfo(
    {
      ...subscription,
      // Convert null to undefined for transactionType
      transactionType: subscription?.transactionType || undefined,
    },
    subscription?.giftDetails,
  )

  // Fetch gift information when the component mounts
  useEffect(() => {
    const fetchGiftInfo = async () => {
      if (!session?.user?.id) return

      try {
        const gifts = await fetchGiftSubscriptions()
        setGiftInfo(gifts)
      } catch (error) {
        console.error('Error fetching gift information:', error)
      }
    }

    fetchGiftInfo()
  }, [session?.user?.id])

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

      <div className='mb-6'>
        <SubscriptionAlerts
          giftInfo={giftInfo}
          statusInfo={statusInfo}
          handlePortalAccess={handlePortalAccess}
          isLoading={isLoading}
          giftSubInfo={giftSubInfo}
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
