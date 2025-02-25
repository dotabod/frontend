import { BillingPlans } from '@/components/Billing/BillingPlans'
import DashboardShell from '@/components/Dashboard/DashboardShell'
import Header from '@/components/Dashboard/Header'
import { SubscriptionStatus } from '@/components/Subscription/SubscriptionStatus'
import { useSubscriptionContext } from '@/contexts/SubscriptionContext'
import { Card } from '@/ui/card'
import { getSubscriptionStatusInfo, isSubscriptionActive } from '@/utils/subscription'
import { Alert, Button, Divider, Space, Typography } from 'antd'
import { ExternalLinkIcon } from 'lucide-react'
import { useSession } from 'next-auth/react'
import Head from 'next/head'
import type { ReactElement } from 'react'
import { useState } from 'react'

const { Title, Text } = Typography

const BillingPage = () => {
  const [isLoading, setIsLoading] = useState(false)
  const { data: session } = useSession()
  const { subscription, isLifetimePlan } = useSubscriptionContext()

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

  return (
    <>
      <Head>
        <title>Dotabod | Billing</title>
      </Head>

      <Header title='Billing' subtitle='View and manage your Dotabod Pro plans' />

      <Card className='mb-6 shadow-sm'>
        <Space direction='vertical' size='large' className='w-full'>
          <SubscriptionStatus />

          {/* Only show manage subscription button for recurring subscriptions with Stripe */}
          {isSubscriptionActive({ status: subscription?.status }) &&
            subscription?.stripeSubscriptionId &&
            !isLifetimePlan && (
              <>
                <Divider className='my-2' />
                <div className='flex justify-between items-center'>
                  <Text>Need to update payment method or cancel?</Text>
                  <Button
                    type='primary'
                    size='middle'
                    icon={<ExternalLinkIcon size={14} />}
                    onClick={handlePortalAccess}
                    disabled={isLoading}
                  >
                    {isLoading ? 'Loading...' : 'Manage subscription'}
                  </Button>
                </div>
              </>
            )}
        </Space>
      </Card>

      {statusInfo?.type === 'warning' && (
        <Alert
          message='Subscription Ending Soon'
          description='Your subscription will end soon. Renew to keep access to all Pro features.'
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
  return <DashboardShell>{page}</DashboardShell>
}

export default BillingPage
