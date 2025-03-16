import { BillingPlans } from '@/components/Billing/BillingPlans'
import DashboardShell from '@/components/Dashboard/DashboardShell'
import Header from '@/components/Dashboard/Header'
import { SubscriptionStatus } from '@/components/Subscription/SubscriptionStatus'
import { useSubscriptionContext } from '@/contexts/SubscriptionContext'
import { fetchGiftSubscriptions } from '@/lib/gift-subscription'
import { getSubscriptionStatusInfo, isSubscriptionActive } from '@/utils/subscription'
import { Alert, Button, Space, Typography } from 'antd'
import { ExternalLinkIcon, GiftIcon } from 'lucide-react'
import { useSession } from 'next-auth/react'
import Head from 'next/head'
import type { ReactElement } from 'react'
import { useState, useEffect } from 'react'

const { Title, Text } = Typography

const BillingPage = () => {
  const [isLoading, setIsLoading] = useState(false)
  const [giftInfo, setGiftInfo] = useState<{
    hasGifts: boolean
    giftCount: number
    giftMessage: string
    proExpiration: Date | null
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
    proExpiration: null,
    hasLifetime: false,
  })
  const { data: session } = useSession()
  const { subscription, isLifetimePlan } = useSubscriptionContext()

  const statusInfo = getSubscriptionStatusInfo(
    subscription?.status,
    subscription?.cancelAtPeriodEnd,
    subscription?.currentPeriodEnd,
    subscription?.transactionType,
    subscription?.stripeSubscriptionId,
    subscription?.isGift,
    giftInfo.proExpiration,
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

  // Determine if the user has both a regular subscription and gift subscription
  const hasBothSubscriptionTypes =
    isSubscriptionActive({ status: subscription?.status }) &&
    !subscription?.isGift &&
    giftInfo.hasGifts

  return (
    <>
      <Head>
        <title>Dotabod | Billing</title>
      </Head>

      <Header title='Billing' subtitle='View and manage your Dotabod Pro plans' />

      <div className='mb-6'>
        <Space direction='vertical' size='large' className='w-full'>
          <SubscriptionStatus />

          {/* Only show manage subscription button for recurring subscriptions with Stripe */}
          {isSubscriptionActive({ status: subscription?.status }) &&
            subscription?.stripeSubscriptionId &&
            !isLifetimePlan &&
            !subscription?.isGift && (
              <Button
                type='primary'
                size='middle'
                icon={<ExternalLinkIcon size={14} />}
                onClick={handlePortalAccess}
                disabled={isLoading}
              >
                {isLoading ? 'Loading...' : 'Manage subscription'}
              </Button>
            )}
        </Space>
      </div>

      {/* Show special alert for users with both subscription types */}
      {hasBothSubscriptionTypes && subscription && (
        <Alert
          message='You Have Multiple Subscriptions'
          description={
            <div>
              <p>You have both a regular subscription and gift subscription(s).</p>
              {giftInfo.proExpiration && subscription.currentPeriodEnd && (
                <p>
                  Your gift subscription{giftInfo.giftCount > 1 ? 's' : ''} will extend your Pro
                  access
                  {subscription.cancelAtPeriodEnd
                    ? ` after your current subscription ends on ${new Date(subscription.currentPeriodEnd).toLocaleDateString()}.`
                    : '.'}
                </p>
              )}
            </div>
          }
          type='info'
          showIcon
          icon={<GiftIcon className='text-indigo-400' />}
          className='mb-6 border-2 border-indigo-800 bg-indigo-950/60 text-indigo-300'
        />
      )}

      {statusInfo?.type === 'warning' && !subscription?.isGift && (
        <Alert
          message='Subscription Ending Soon'
          description={
            giftInfo.hasGifts
              ? 'Your paid subscription will end soon, but you have gift subscription(s) that will extend your access.'
              : 'Your subscription will end soon. Renew to keep access to all Pro features.'
          }
          type='warning'
          showIcon
          className='mb-6'
          action={
            <Button size='small' type='primary' onClick={handlePortalAccess}>
              Renew Now
            </Button>
          }
        />
      )}

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
