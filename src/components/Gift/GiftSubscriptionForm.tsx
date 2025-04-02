import { plans } from '@/components/Billing/BillingPlans'
import { createGiftCheckoutSession } from '@/lib/gift-subscription'
import { SUBSCRIPTION_TIERS, type PricePeriod } from '@/utils/subscription'
import { Alert, App, Button, Form, Input, Space, Typography, InputNumber, Tooltip } from 'antd'
import { useState, useEffect } from 'react'
import { Card } from '@/ui/card'
import Link from 'next/link'
import { detect } from 'curse-filter'
import TwitchChat from '@/components/TwitchChat'
import GiftSubscriptionAlert from '@/components/Overlay/GiftAlert/GiftSubscriptionAlert'

const { Title, Text, Paragraph } = Typography

// Define the form values type
interface GiftFormValues {
  recipientUsername: string
  giftSenderName?: string
  giftMessage?: string
  quantity?: number
}

interface GiftSubscriptionFormProps {
  recipientUsername?: string
  recipientDisplayName?: string
  canceled?: boolean
  loading?: boolean
}

export const GiftSubscriptionForm = ({
  recipientUsername,
  recipientDisplayName,
  canceled = false,
}: GiftSubscriptionFormProps) => {
  const { message } = App.useApp()
  const [form] = Form.useForm<GiftFormValues>()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [quantity, setQuantity] = useState<number>(1)
  const [formError, setFormError] = useState<string | null>(null)
  const [usernameError, setUsernameError] = useState<string | null>(null)
  const [senderName, setSenderName] = useState<string>('Anonymous')
  const [giftMessage, setGiftMessage] = useState<string>('')
  const selectedTier = SUBSCRIPTION_TIERS.PRO

  // Always use monthly for gift subscriptions
  const activePeriod: PricePeriod = 'monthly'

  // Function to check for profanity in text
  const checkForProfanity = (text: string | undefined): boolean => {
    if (!text) return false
    return detect(text)
  }

  // Set the recipient username from props
  useEffect(() => {
    if (recipientUsername) {
      form.setFieldsValue({ recipientUsername })
    }
  }, [recipientUsername, form])

  // Clear username error when username changes
  const handleUsernameChange = () => {
    if (usernameError) {
      setUsernameError(null)
    }
  }

  // Update the sender name when the form field changes
  const handleSenderNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSenderName(e.target.value || 'Anonymous')
  }

  // Update the gift message when the form field changes
  const handleGiftMessageChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setGiftMessage(e.target.value || '')
  }

  const handleSubmit = async (values: GiftFormValues) => {
    try {
      setIsSubmitting(true)
      // Clear any previous errors
      setFormError(null)
      setUsernameError(null)

      // Ensure quantity is a number
      const submittedValues = {
        ...values,
        quantity: Number(values.quantity) || 1,
      }

      // Client-side profanity check for immediate feedback
      // Note: We still rely on server-side validation for security
      if (checkForProfanity(submittedValues.giftMessage)) {
        form.setFields([
          {
            name: 'giftMessage',
            errors: ['Your message contains inappropriate language. Please revise it.'],
          },
        ])
        setFormError('Please remove inappropriate language from your message.')
        setIsSubmitting(false)
        return
      }

      if (checkForProfanity(submittedValues.giftSenderName)) {
        form.setFields([
          {
            name: 'giftSenderName',
            errors: ['Your name contains inappropriate language. Please revise it.'],
          },
        ])
        setFormError('Please remove inappropriate language from your name.')
        setIsSubmitting(false)
        return
      }

      const priceId = process.env.NEXT_PUBLIC_STRIPE_CREDIT_PRICE_ID as string

      const result = await createGiftCheckoutSession({
        recipientUsername: submittedValues.recipientUsername,
        priceId,
        giftMessage: submittedValues.giftMessage,
        giftSenderName: submittedValues.giftSenderName,
        quantity: submittedValues.quantity,
      })

      // Check if the result contains an error or message
      if ('error' in result || 'message' in result) {
        const errorText =
          'message' in result
            ? result.message
            : 'error' in result
              ? result.error
              : 'Failed to create gift checkout. Please try again.'

        // Check if the error is about lifetime subscription or recipient not found
        if (
          errorText.includes('lifetime subscription') ||
          errorText.includes('Recipient not found')
        ) {
          // Set error specifically on the username field
          setUsernameError(errorText)
          // Update the form field with error
          form.setFields([
            {
              name: 'recipientUsername',
              errors: [errorText],
            },
          ])
        } else {
          // For other errors, use the general form error
          setFormError(errorText)
        }

        // Also show the toast message
        message.error(errorText)
        return
      }

      // If we get here, we have a URL
      window.location.href = result.url
    } catch (error: unknown) {
      console.error('Gift checkout error:', error)
      // Handle any unexpected errors
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to create gift checkout. Please try again.'

      // Set the form error to display in the UI
      setFormError(errorMessage)

      // Also show the toast message
      message.error(errorMessage)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Calculate the total price based on quantity and period
  const calculateTotalPrice = () => {
    const basePrice = plans.find((p) => p.tier === selectedTier)?.price[activePeriod] || '$0'

    // Extract the numeric value from the price string (e.g., "$5" -> 5)
    const numericPrice = Number.parseFloat(basePrice.replace(/[^0-9.]/g, ''))
    const total = numericPrice * quantity

    // Format the total price with the same currency symbol
    const currencySymbol = basePrice.match(/[^0-9.]/g)?.[0] || '$'
    return `${currencySymbol}${total.toFixed(2)}`
  }

  const displayName = recipientDisplayName || recipientUsername || 'this streamer'

  // Create gift message preview for Twitch chat
  const giftChatMessage = (
    <>
      {senderName === 'Anonymous' ? (
        <span className='space-x-1'>
          <span>A gift sub for Dotabod Pro was just gifted anonymously!</span>
          {giftMessage && <span>{giftMessage}</span>}
        </span>
      ) : (
        <span className='space-x-1'>
          <span>
            A gift sub for Dotabod Pro was just gifted by{' '}
            <span className='text-purple-400 font-semibold'>{senderName}</span>!
          </span>
          {giftMessage && <span>{giftMessage}</span>}
        </span>
      )}
    </>
  )

  return (
    <div className='mx-auto pb-12 flex flex-wrap flex-col gap-4'>
      <div className='flex flex-row justify-center gap-4 px-4 md:px-0'>
        {canceled && (
          <Alert
            message='Payment Canceled'
            description="Your gift subscription payment was canceled. You can try again when you're ready."
            type='info'
            showIcon
            className='mb-8 w-full'
          />
        )}
      </div>

      <div className='flex flex-col md:flex-row flex-wrap justify-center gap-4 px-4 md:px-0'>
        <Card className='w-full md:w-auto'>
          <Title level={4}>
            {recipientUsername ? (
              <>
                Gift a Subscription to <Link href={`/${recipientUsername}`}>{displayName}</Link>
              </>
            ) : (
              'Gift a Subscription'
            )}
          </Title>
          <Paragraph>
            {recipientUsername ? (
              <>
                Support <Link href={`/${recipientUsername}`}>{displayName}</Link> by gifting them
                Dotabod Pro! They'll get access to all Pro features.
              </>
            ) : (
              "Support this streamer by gifting them Dotabod Pro! They'll get access to all Pro features."
            )}
          </Paragraph>

          <Form
            form={form}
            layout='vertical'
            onFinish={handleSubmit}
            requiredMark={false}
            initialValues={{
              quantity: 1,
              recipientUsername: recipientUsername || '',
            }}
          >
            <Form.Item
              name='quantity'
              label='Duration'
              tooltip='How many months of Pro the recipient will receive'
            >
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
                  className='w-24 sm:w-32'
                />
                <Text className='ml-2'>months</Text>
              </div>
            </Form.Item>

            <Form.Item
              name='recipientUsername'
              label="Recipient's Username"
              rules={[{ required: true, message: "Please enter the recipient's username" }]}
              tooltip='Enter the Twitch username of the streamer you want to gift to'
              validateStatus={usernameError ? 'error' : undefined}
              help={usernameError}
            >
              <Input
                placeholder='Enter Twitch username'
                disabled={!!recipientUsername}
                onChange={handleUsernameChange}
                className='w-full'
              />
            </Form.Item>

            <Form.Item
              name='giftSenderName'
              label='Your Name (Optional)'
              tooltip='This will be shown to the recipient'
              rules={[
                {
                  validator: (_, value) => {
                    // Client-side validation for immediate user feedback
                    // Server will also validate to ensure security
                    if (value && checkForProfanity(value)) {
                      return Promise.reject('Please remove inappropriate language from your name')
                    }
                    return Promise.resolve()
                  },
                },
              ]}
            >
              <Input
                placeholder='Your name or leave blank to gift anonymously'
                onChange={handleSenderNameChange}
                className='w-full'
              />
            </Form.Item>

            <Form.Item
              name='giftMessage'
              label='Gift Message (Optional)'
              tooltip='A personal message to include with your gift'
              rules={[
                {
                  validator: (_, value) => {
                    // Client-side validation for immediate user feedback
                    // Server will also validate to ensure security
                    if (value && checkForProfanity(value)) {
                      return Promise.reject(
                        'Please remove inappropriate language from your message',
                      )
                    }
                    return Promise.resolve()
                  },
                },
              ]}
            >
              <Input.TextArea
                placeholder='Add a personal message'
                rows={3}
                maxLength={200}
                showCount
                onChange={handleGiftMessageChange}
                className='w-full'
              />
            </Form.Item>

            {formError && (
              <Form.Item>
                <div className='ant-form-item-explain ant-form-item-explain-error'>
                  <div role='alert' className='ant-form-item-explain-error'>
                    {formError}
                  </div>
                </div>
              </Form.Item>
            )}

            <Form.Item>
              {usernameError ? (
                <Tooltip title='Please change the recipient username to continue'>
                  <Button
                    type='primary'
                    htmlType='submit'
                    loading={isSubmitting}
                    size='large'
                    block
                    disabled={true}
                    className='mt-2'
                  >
                    Continue to Payment
                  </Button>
                </Tooltip>
              ) : (
                <Button
                  type='primary'
                  htmlType='submit'
                  loading={isSubmitting}
                  size='large'
                  block
                  disabled={isSubmitting}
                  className='mt-2'
                >
                  Continue to Payment
                </Button>
              )}
            </Form.Item>
          </Form>
        </Card>
        <Card className='w-full md:w-auto'>
          <Title level={4}>Gift Subscription Preview</Title>
          <Paragraph>
            Here's how your gift will appear in the streamer's Twitch chat and overlay when they
            receive it:
          </Paragraph>

          <div className='space-y-6'>
            <div>
              <Text strong className='mb-2 block'>
                Twitch Chat
              </Text>
              <TwitchChat responses={[giftChatMessage]} />
            </div>

            <div>
              <Text strong className='mb-2 block'>
                Stream Overlay
              </Text>
              <div className='rounded-md bg-gray-800 p-2 sm:p-4'>
                <div className='relative h-40 sm:h-52 w-full overflow-hidden flex items-center justify-center'>
                  <GiftSubscriptionAlert
                    senderName={senderName}
                    giftType='monthly'
                    giftQuantity={quantity}
                    giftMessage={giftMessage}
                    preview={true}
                    className=''
                  />
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>

      <div className='max-w-5xl w-full flex flex-col justify-center gap-4 self-center px-4 md:px-0'>
        <Card>
          <Title level={4}>Why Gift Dotabod Pro?</Title>
          <Space direction='vertical' size='middle' className='w-full'>
            <div className='space-y-1'>
              <Text strong>Support {recipientUsername ? displayName : 'Streamers'}</Text>
              <Paragraph className='text-sm sm:text-base'>
                Help them elevate their stream with professional Dota 2 overlays and analytics.
              </Paragraph>
            </div>
            <div className='space-y-1'>
              <Text strong>No Recurring Charges</Text>
              <Paragraph className='text-sm sm:text-base'>
                You pay once for the duration you choose. No recurring charges for you or the
                recipient.
              </Paragraph>
            </div>
            <div className='space-y-1'>
              <Text strong>Subscription Extension</Text>
              <Paragraph className='text-sm sm:text-base'>
                Multiple gifts extend the recipient's Pro subscription duration. They'll enjoy Pro
                features longer.
              </Paragraph>
            </div>
          </Space>
        </Card>

        <Card className='mt-4'>
          <Title level={4}>How Gift Subscriptions Work</Title>
          <div className='space-y-3'>
            <div className='space-y-1'>
              <Text strong>For New Users:</Text>
              <Paragraph className='text-sm sm:text-base'>
                If the recipient has never subscribed to Dotabod Pro, they will need to set up a
                subscription after receiving your gift. The credits will be automatically applied,
                so they won't be charged for the duration of your gift.
              </Paragraph>
            </div>

            <div className='space-y-1'>
              <Text strong>For Existing Subscribers:</Text>
              <Paragraph className='text-sm sm:text-base'>
                If the recipient is already a Pro subscriber, the gift credits will automatically be
                applied to their account and used when their subscription renews.
              </Paragraph>
            </div>

            <div className='space-y-1'>
              <Text strong>Not Valid for Lifetime Purchases:</Text>
              <Paragraph className='text-sm sm:text-base'>
                Gift credits can only be applied toward monthly Pro subscriptions, not toward
                lifetime purchases.
              </Paragraph>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
