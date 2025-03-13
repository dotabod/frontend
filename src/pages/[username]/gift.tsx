import { plans } from '@/components/Billing/BillingPlans'
import { PeriodToggle } from '@/components/Billing/PeriodToggle'
import { createGiftCheckoutSession } from '@/lib/gift-subscription'
import { getPriceId, SUBSCRIPTION_TIERS, type PricePeriod } from '@/utils/subscription'
import { Alert, App, Button, Form, Input, Layout, Space, Typography, InputNumber } from 'antd'
import { useRouter } from 'next/router'
import { useState, type ReactElement, useEffect } from 'react'
import { GiftIcon } from 'lucide-react'
import { Card } from '@/ui/card'
import HomepageShell from '@/components/Homepage/HomepageShell'
import type { NextPageWithLayout } from '@/pages/_app'
import { useGetSettingsByUsername } from '@/lib/hooks/useUpdateSetting'
import Head from 'next/head'

const { Title, Text, Paragraph } = Typography
const { Content } = Layout

// Define the form values type
interface GiftFormValues {
  recipientUsername: string
  giftSenderName?: string
  giftMessage?: string
  quantity?: number
}

const GiftSubscriptionPage: NextPageWithLayout = () => {
  const router = useRouter()
  const { username } = router.query
  const { message } = App.useApp()
  const [form] = Form.useForm<GiftFormValues>()
  const [activePeriod, setActivePeriod] = useState<PricePeriod>('monthly')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [quantity, setQuantity] = useState<number>(1)
  const selectedTier = SUBSCRIPTION_TIERS.PRO
  const { data, loading, error, notFound } = useGetSettingsByUsername()

  // Get the canceled status from the URL query
  const canceled = router.query.canceled === 'true'

  // Reset quantity to 1 when selecting lifetime
  useEffect(() => {
    if (activePeriod === 'lifetime' && quantity > 1) {
      setQuantity(1)
      form.setFieldsValue({ quantity: 1 })
    }
  }, [activePeriod, quantity, form])

  // Set the recipient username from the URL parameter
  useEffect(() => {
    if (username && typeof username === 'string') {
      form.setFieldsValue({ recipientUsername: username })
    }
  }, [username, form])

  // Redirect to 404 if user not found
  useEffect(() => {
    if (username && !loading && (notFound || data?.error || error)) {
      router.push('/404')
    }
  }, [data, loading, router, notFound, error, username])

  if (loading) {
    return (
      <div className='p-6 flex justify-center items-center min-h-screen'>
        <div className='text-center'>
          <div className='mb-4'>Loading user data...</div>
        </div>
      </div>
    )
  }

  const handleSubmit = async (values: GiftFormValues) => {
    try {
      setIsSubmitting(true)

      const priceId = getPriceId(selectedTier as typeof SUBSCRIPTION_TIERS.PRO, activePeriod)

      const { url } = await createGiftCheckoutSession({
        recipientUsername: values.recipientUsername,
        priceId,
        giftDuration: activePeriod,
        giftMessage: values.giftMessage,
        giftSenderName: values.giftSenderName,
        quantity: values.quantity || 1,
      })

      window.location.href = url
    } catch (error) {
      console.error('Gift checkout error:', error)
      message.error('Failed to create gift checkout. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Calculate the total price based on quantity and period
  const calculateTotalPrice = () => {
    const basePrice = plans.find((p) => p.tier === selectedTier)?.price[activePeriod] || '$0'

    // For lifetime, quantity is always 1
    if (activePeriod === 'lifetime') {
      return basePrice
    }

    // Extract the numeric value from the price string (e.g., "$5" -> 5)
    const numericPrice = Number.parseFloat(basePrice.replace(/[^0-9.]/g, ''))
    const total = numericPrice * quantity

    // Format the total price with the same currency symbol
    const currencySymbol = basePrice.match(/[^0-9.]/g)?.[0] || '$'
    return `${currencySymbol}${total.toFixed(2)}`
  }

  return (
    <>
      <Head>
        <title>{`Gift a subscription to ${!loading && data?.displayName ? data.displayName : username} - Dotabod`}</title>
        <meta
          name='description'
          content={`Support ${!loading && data?.displayName ? data.displayName : username} by gifting them Dotabod Pro!`}
        />
        {username && typeof username === 'string' && (
          <link rel='canonical' href={`https://dotabod.com/${username}/gift`} />
        )}
      </Head>
      <div className='max-w-4xl mx-auto pb-12 flex flex-col gap-4'>
        {canceled && (
          <Alert
            message='Payment Canceled'
            description="Your gift subscription payment was canceled. You can try again when you're ready."
            type='info'
            showIcon
            className='mb-8'
          />
        )}

        <Card>
          <Title level={4}>
            Gift a Subscription to {!loading && data?.displayName ? data.displayName : username}
          </Title>
          <Paragraph>
            Support {!loading && data?.displayName ? data.displayName : username} by gifting them
            Dotabod Pro! They'll get access to all Pro features.
          </Paragraph>

          <div className='mb-8 gap-6 flex flex-col'>
            <Title level={5}>Select Duration</Title>
            <div className='mb-6'>
              <PeriodToggle
                activePeriod={activePeriod}
                onChange={setActivePeriod}
                subscription={null}
              />
            </div>

            {activePeriod !== 'lifetime' && (
              <div className='mb-6'>
                <Title level={5}>Duration</Title>
                <div className='flex flex-col'>
                  <div className='flex items-center'>
                    <InputNumber
                      min={1}
                      max={100}
                      value={quantity}
                      onChange={(value) => {
                        const newQuantity = Number(value) || 1
                        setQuantity(newQuantity)
                        form.setFieldsValue({ quantity: newQuantity })
                      }}
                      style={{ width: 100 }}
                    />
                    <Text className='ml-2'>{activePeriod === 'monthly' ? 'months' : 'years'}</Text>
                  </div>
                  <Text type='secondary' className='mt-1'>
                    This will extend the subscription duration, not create multiple subscriptions.
                    You can also adjust the quantity during checkout.
                  </Text>
                </div>
              </div>
            )}

            <div className='bg-purple-800 p-4 rounded-md mb-6'>
              <div className='flex items-center mb-2'>
                <GiftIcon className='h-5 w-5 mr-2 text-blue-500' />
                <Text strong>You're gifting:</Text>
              </div>
              <Text>
                {activePeriod === 'lifetime'
                  ? 'Lifetime'
                  : quantity > 1
                    ? `${quantity} ${activePeriod === 'annual' ? 'Years' : 'Months'}`
                    : activePeriod === 'annual'
                      ? '1 Year'
                      : '1 Month'}{' '}
                of Dotabod Pro
              </Text>
              <div className='mt-2'>
                <Text strong>Price: </Text>
                <Text>{calculateTotalPrice()}</Text>
              </div>
              {quantity > 1 && activePeriod !== 'lifetime' && (
                <div className='mt-2'>
                  <Text type='secondary'>
                    The recipient will receive a single subscription that lasts for {quantity}{' '}
                    {activePeriod === 'annual' ? 'years' : 'months'}.
                  </Text>
                </div>
              )}
            </div>
          </div>

          <Form
            form={form}
            layout='vertical'
            onFinish={handleSubmit}
            requiredMark={false}
            initialValues={{
              quantity: 1,
              recipientUsername: typeof username === 'string' ? username : '',
            }}
          >
            <Form.Item
              name='recipientUsername'
              label="Recipient's Username"
              rules={[{ required: true, message: "Please enter the recipient's username" }]}
              tooltip='Enter the Twitch username of the streamer you want to gift to'
            >
              <Input placeholder='Enter Twitch username' disabled={!!username} />
            </Form.Item>

            <Form.Item
              name='giftSenderName'
              label='Your Name (Optional)'
              tooltip='This will be shown to the recipient'
            >
              <Input placeholder='Your name or leave blank to gift anonymously' />
            </Form.Item>

            <Form.Item
              name='giftMessage'
              label='Gift Message (Optional)'
              tooltip='A personal message to include with your gift'
            >
              <Input.TextArea
                placeholder='Add a personal message'
                rows={3}
                maxLength={200}
                showCount
              />
            </Form.Item>

            <Form.Item name='quantity' hidden>
              <InputNumber />
            </Form.Item>

            <Form.Item>
              <Button type='primary' htmlType='submit' loading={isSubmitting} size='large' block>
                Continue to Payment
              </Button>
            </Form.Item>
          </Form>
        </Card>

        <Card>
          <Title level={4}>Why Gift Dotabod Pro?</Title>
          <Space direction='vertical' size='middle'>
            <div>
              <Text strong>Support Your Favorite Streamer</Text>
              <Paragraph>
                Help them enhance their stream with professional Dota 2 overlays and analytics.
              </Paragraph>
            </div>
            <div>
              <Text strong>Premium Features</Text>
              <Paragraph>
                Give them access to all Pro features including advanced stats, custom overlays, and
                more.
              </Paragraph>
            </div>
            <div>
              <Text strong>No Recurring Charges</Text>
              <Paragraph>
                You pay once for the duration you choose. No subscription required for you.
              </Paragraph>
            </div>
          </Space>
        </Card>
      </div>
    </>
  )
}

GiftSubscriptionPage.getLayout = function getLayout(page: ReactElement) {
  const router = useRouter()
  const { username } = router.query
  const { data, loading } = useGetSettingsByUsername()

  return (
    <HomepageShell
      seo={{
        title: `Gift a subscription to ${!loading && data?.displayName ? data.displayName : username} - Dotabod`,
        description: `Support ${!loading && data?.displayName ? data.displayName : username} by gifting them Dotabod Pro!`,
        canonicalUrl: `https://dotabod.com/${username}/gift`,
      }}
    >
      {page}
    </HomepageShell>
  )
}
export default GiftSubscriptionPage
