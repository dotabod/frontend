import {
  Alert,
  Button,
  Card,
  Input,
  InputNumber,
  Layout,
  message,
  Select,
  Space,
  Typography,
} from 'antd'
import Head from 'next/head'
import { useSession } from 'next-auth/react'
import type React from 'react'
import { useEffect, useState } from 'react'
import useSWR from 'swr'
import DashboardShell from '@/components/Dashboard/DashboardShell'
import { fetcher } from '@/lib/fetcher'
import { STABLE_SWR_OPTIONS } from '@/lib/hooks/useUpdateSetting'
import { requireDashboardAccess } from '@/lib/server/dashboardAccess'
import type { NextPageWithLayout } from '@/pages/_app'

const { Content } = Layout
const { Title, Text, Paragraph } = Typography
const { Option } = Select

const TestGiftPage: NextPageWithLayout = () => {
  const { status } = useSession()
  const [loading, setLoading] = useState(false)
  const [giftType, setGiftType] = useState<string>('monthly')
  const [giftMessage, setGiftMessage] = useState<string>(
    'This is a test gift message. Enjoy your subscription!',
  )
  const [giftQuantity, setGiftQuantity] = useState<number>(1)
  const [messageApi, contextHolder] = message.useMessage()

  // Fetch subscription status to check if user has lifetime
  const { data: giftNotificationData } = useSWR(
    status === 'authenticated' ? '/api/gift-notifications' : null,
    fetcher,
    STABLE_SWR_OPTIONS,
  )

  const [hasLifetime, setHasLifetime] = useState(false)
  const [totalGiftedMonths, setTotalGiftedMonths] = useState<number | 'lifetime'>(0)

  useEffect(() => {
    if (giftNotificationData) {
      setHasLifetime(giftNotificationData.hasLifetime || false)
      setTotalGiftedMonths(giftNotificationData.totalGiftedMonths || 0)
    }
  }, [giftNotificationData])

  // Reset quantity to 1 when selecting lifetime
  useEffect(() => {
    if (giftType === 'lifetime' && giftQuantity > 1) {
      setGiftQuantity(1)
    }
  }, [giftType, giftQuantity])

  const createTestNotification = async () => {
    if (status !== 'authenticated') {
      messageApi.error('You must be logged in to create a test notification')
      return
    }

    setLoading(true)
    try {
      const response = await fetch(`/api/test-gift-notification?giftType=${giftType}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          giftMessage,
          giftQuantity,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Failed to create test notification')
      }

      messageApi.success('Test gift notification created successfully!')
      console.log('Created notification:', data)
    } catch (error) {
      console.error('Error creating test notification:', error)
      messageApi.error('Failed to create test notification')
    } finally {
      setLoading(false)
    }
  }

  // Format subscription status message
  const getSubscriptionStatusMessage = () => {
    if (hasLifetime) {
      return {
        type: 'info',
        message:
          'You already have a Lifetime subscription. In a real scenario, users would not be able to gift you additional subscriptions.',
      }
    }

    if (typeof totalGiftedMonths === 'number' && totalGiftedMonths > 0) {
      return {
        type: 'info',
        message: `You currently have ${totalGiftedMonths} month${totalGiftedMonths > 1 ? 's' : ''} of gifted Dotabod Pro.`,
      }
    }

    return null
  }

  const subscriptionStatus = getSubscriptionStatusMessage()

  return (
    <>
      {contextHolder}
      <Head>
        <title>Test Gift Notification | Dotabod</title>
      </Head>
      <Layout>
        <Content style={{ padding: '50px', maxWidth: '800px', margin: '0 auto' }}>
          <Card>
            <Title level={2}>Test Gift Notification</Title>

            {status === 'loading' ? (
              <Paragraph>Loading...</Paragraph>
            ) : status === 'unauthenticated' ? (
              <Paragraph>You must be logged in to use this page.</Paragraph>
            ) : (
              <Space direction='vertical' style={{ width: '100%' }}>
                <Paragraph>
                  This page allows you to create a test gift notification for development purposes.
                  The notification will appear in your dashboard.
                </Paragraph>

                {subscriptionStatus && (
                  <Alert
                    type={subscriptionStatus.type as 'info' | 'warning'}
                    message={subscriptionStatus.message}
                    style={{ marginBottom: 16 }}
                  />
                )}

                <div style={{ marginBottom: 16 }}>
                  <Text strong>Gift Type:</Text>
                  <Select
                    style={{ width: 200, marginLeft: 8 }}
                    value={giftType}
                    onChange={(value) => setGiftType(value)}
                  >
                    <Option value='monthly'>Monthly</Option>
                    <Option value='annual'>Annual</Option>
                    <Option value='lifetime'>Lifetime</Option>
                  </Select>
                </div>

                {giftType !== 'lifetime' && (
                  <div style={{ marginBottom: 16 }}>
                    <Text strong>Quantity:</Text>
                    <InputNumber
                      style={{ width: 100, marginLeft: 8 }}
                      min={1}
                      max={100}
                      value={giftQuantity}
                      onChange={(value) => setGiftQuantity(Number(value) || 1)}
                    />
                    <Text style={{ marginLeft: 8 }}>
                      {giftType === 'monthly' ? 'months' : 'years'}
                    </Text>
                  </div>
                )}

                <div style={{ marginBottom: 16 }}>
                  <Text strong>Gift Message:</Text>
                  <Input.TextArea
                    rows={3}
                    value={giftMessage}
                    onChange={(e) => setGiftMessage(e.target.value)}
                    style={{ marginTop: 8 }}
                  />
                </div>

                <Button type='primary' onClick={createTestNotification} loading={loading}>
                  Create Test Notification
                </Button>
              </Space>
            )}
          </Card>
        </Content>
      </Layout>
    </>
  )
}

TestGiftPage.getLayout = function getLayout(page: React.ReactElement) {
  return (
    <DashboardShell
      seo={{
        title: 'Test Gift Notification | Dotabod',
        description: 'Test gift notification for Dotabod',
        canonicalUrl: 'https://dotabod.com/dashboard/admin/test-gift',
        noindex: true,
      }}
    >
      {page}
    </DashboardShell>
  )
}

export const getServerSideProps = requireDashboardAccess({ requireAdmin: true })

export default TestGiftPage
