import { plans } from '@/components/Billing/BillingPlans'
import { PeriodToggle } from '@/components/Billing/PeriodToggle'
import { createGiftCheckoutSession } from '@/lib/gift-subscription'
import { getPriceId, SUBSCRIPTION_TIERS, type PricePeriod } from '@/utils/subscription'
import { Alert, App, Button, Form, Input, Layout, Space, Typography } from 'antd'
import { useRouter } from 'next/router'
import { useState, type ReactElement } from 'react'
import { GiftIcon } from 'lucide-react'
import { Card } from '@/ui/card'
import HomepageShell from '@/components/Homepage/HomepageShell'
import type { NextPageWithLayout } from '@/pages/_app'

const { Title, Text, Paragraph } = Typography
const { Content } = Layout

// Define the form values type
interface GiftFormValues {
  recipientUsername: string
  giftSenderName?: string
  giftMessage?: string
}

const GiftSubscriptionPage: NextPageWithLayout = () => {
  const router = useRouter()
  const { message } = App.useApp()
  const [form] = Form.useForm<GiftFormValues>()
  const [activePeriod, setActivePeriod] = useState<PricePeriod>('monthly')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const selectedTier = SUBSCRIPTION_TIERS.PRO

  // Get the canceled status from the URL query
  const canceled = router.query.canceled === 'true'

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
      })

      window.location.href = url
    } catch (error) {
      console.error('Gift checkout error:', error)
      message.error('Failed to create gift checkout. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
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
        <Title level={4}>Gift a Subscription</Title>
        <Paragraph>
          Support your favorite streamer by gifting them Dotabod Pro! They'll get access to all Pro
          features.
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

          <div className='bg-purple-800 p-4 rounded-md mb-6'>
            <div className='flex items-center mb-2'>
              <GiftIcon className='h-5 w-5 mr-2 text-blue-500' />
              <Text strong>You're gifting:</Text>
            </div>
            <Text>
              {activePeriod === 'lifetime'
                ? 'Lifetime'
                : activePeriod === 'annual'
                  ? '1 Year'
                  : '1 Month'}{' '}
              of Dotabod Pro
            </Text>
            <div className='mt-2'>
              <Text strong>Price: </Text>
              <Text>{plans.find((p) => p.tier === selectedTier)?.price[activePeriod]}</Text>
            </div>
          </div>
        </div>

        <Form form={form} layout='vertical' onFinish={handleSubmit} requiredMark={false}>
          <Form.Item
            name='recipientUsername'
            label="Recipient's Username"
            rules={[{ required: true, message: "Please enter the recipient's username" }]}
            tooltip='Enter the Twitch username of the streamer you want to gift to'
          >
            <Input placeholder='Enter Twitch username' />
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
  )
}

GiftSubscriptionPage.getLayout = function getLayout(page: ReactElement) {
  return <HomepageShell>{page}</HomepageShell>
}

export default GiftSubscriptionPage
