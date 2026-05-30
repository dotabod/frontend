import { Alert, App, Button, Form, Input, InputNumber } from 'antd'
import clsx from 'clsx'
import { detect } from 'curse-filter'
import { motion, useReducedMotion } from 'framer-motion'
import {
  GiftIcon,
  InfinityIcon,
  ReceiptTextIcon,
  ShieldCheckIcon,
  SparklesIcon,
} from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { plans } from '@/components/Billing/BillingPlans'
import { createGiftCheckoutSession } from '@/lib/gift-subscription'
import { Card } from '@/ui/card'
import { SUBSCRIPTION_TIERS } from '@/utils/subscription'
import { GiftPreview } from './GiftPreview'

// Define the form values type
interface GiftFormValues {
  recipientUsername: string
  giftSenderName?: string
  giftMessage?: string
}

interface GiftSubscriptionFormProps {
  recipientUsername?: string
  recipientDisplayName?: string
  canceled?: boolean
  loading?: boolean
}

const DURATION_PRESETS = [1, 3, 6, 12]

const PRO_HIGHLIGHTS = [
  'Auto Twitch predictions on every match',
  'Advanced overlays: XL minimap, anti-snipe blockers',
  'Notable players overlay with country flags',
  'Auto Roshan and Aegis timers',
  'OBS scene switcher and Spotify integration',
  'Pro chat commands (!hero, !np, !items, !smurfs)',
]

const HOW_IT_WORKS = [
  {
    title: 'They get notified in chat',
    body: 'A message in their Twitch chat announces your gift, usually within 1 to 3 minutes of checkout.',
  },
  {
    title: 'New to Pro? Credits apply automatically',
    body: "If they've never subscribed, they set up Pro and your credits cover the months you gifted. No charge until those run out.",
  },
  {
    title: 'Already Pro? The time just stacks',
    body: 'Existing subscribers keep their plan and your credits extend it, so they get Pro for longer.',
  },
]

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

  const reduceMotion = useReducedMotion()
  const fadeUp = (delay: number) => ({
    initial: reduceMotion ? false : { opacity: 0, y: 14 },
    animate: { opacity: 1, y: 0 },
    transition: { delay, duration: 0.5, ease: [0.22, 1, 0.36, 1] as const },
  })

  // Pull the live monthly Pro price so the buyer always sees the total.
  const proMonthly = plans.find((p) => p.tier === SUBSCRIPTION_TIERS.PRO)?.price.monthly ?? '$6'
  const currency = proMonthly.match(/[^0-9.]/)?.[0] ?? '$'
  const unitPrice = Number.parseFloat(proMonthly.replaceAll(/[^0-9.]/g, '')) || 6
  const total = unitPrice * quantity
  const formatPrice = (value: number) => `${currency}${value % 1 === 0 ? value : value.toFixed(2)}`

  // Function to check for profanity in text
  const checkForProfanity = (text: string | undefined): boolean => {
    if (!text) {
      return false
    }
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

      const submittedValues = {
        ...values,
        quantity: Number(quantity) || 1,
      }

      // Client-side profanity check for immediate feedback
      // Note: We still rely on server-side validation for security
      if (checkForProfanity(submittedValues.giftMessage)) {
        form.setFields([
          {
            errors: ['Your message contains inappropriate language. Please revise it.'],
            name: 'giftMessage',
          },
        ])
        setFormError('Please remove inappropriate language from your message.')
        setIsSubmitting(false)
        return
      }

      if (checkForProfanity(submittedValues.giftSenderName)) {
        form.setFields([
          {
            errors: ['Your name contains inappropriate language. Please revise it.'],
            name: 'giftSenderName',
          },
        ])
        setFormError('Please remove inappropriate language from your name.')
        setIsSubmitting(false)
        return
      }

      const priceId = process.env.NEXT_PUBLIC_STRIPE_CREDIT_PRICE_ID as string

      const result = await createGiftCheckoutSession({
        giftMessage: submittedValues.giftMessage,
        giftSenderName: submittedValues.giftSenderName,
        priceId,
        quantity: submittedValues.quantity,
        recipientUsername: submittedValues.recipientUsername,
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
              errors: [errorText],
              name: 'recipientUsername',
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

  const displayName = recipientDisplayName || recipientUsername || 'this streamer'
  const recipientLink = recipientUsername ? (
    <Link
      href={`/${recipientUsername}`}
      className='text-purple-300 underline-offset-4 hover:underline'
    >
      {displayName}
    </Link>
  ) : null

  return (
    <div className='mx-auto w-full max-w-5xl px-4 pb-20 md:px-6'>
      {canceled && (
        <Alert
          message='Payment canceled'
          description="Your gift checkout was canceled. Nothing was charged. Pick up where you left off whenever you're ready."
          type='info'
          showIcon
          className='mt-8'
        />
      )}

      {/* Hero */}
      <motion.header {...fadeUp(0)} className='pt-12 md:pt-16'>
        <p className='text-xs font-medium uppercase tracking-[0.2em] text-gray-500'>
          A gift that keeps streaming
        </p>
        <h1 className='mt-3 text-balance text-4xl font-semibold leading-tight tracking-tight text-gray-100 sm:text-5xl'>
          {recipientLink ? <>Gift Dotabod Pro to {recipientLink}</> : 'Gift Dotabod Pro'}
        </h1>
        <p className='mt-4 max-w-2xl text-pretty text-lg text-gray-400'>
          {recipientUsername
            ? `Hand ${displayName} the full Dotabod kit: auto predictions, advanced overlays, and every pro command. You pay once, they get the months.`
            : 'Hand your favorite Dota 2 streamer the full Dotabod kit: auto predictions, advanced overlays, and every pro command. You pay once, they get the months.'}
        </p>
        <ul className='mt-6 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-gray-500'>
          <li className='flex items-center gap-1.5'>
            <ReceiptTextIcon className='h-4 w-4 text-gray-500' aria-hidden />
            {formatPrice(unitPrice)} per month
          </li>
          <li aria-hidden className='text-gray-700'>
            ·
          </li>
          <li className='flex items-center gap-1.5'>
            <InfinityIcon className='h-4 w-4 text-gray-500' aria-hidden />
            Pay once, no recurring charges
          </li>
          <li aria-hidden className='text-gray-700'>
            ·
          </li>
          <li className='flex items-center gap-1.5'>
            <ShieldCheckIcon className='h-4 w-4 text-gray-500' aria-hidden />
            Secure checkout via Stripe
          </li>
        </ul>
      </motion.header>

      {/* Form + live preview */}
      <div className='mt-10 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-8'>
        <motion.div {...fadeUp(0.08)}>
          <Card className='h-full'>
            <Form
              form={form}
              layout='vertical'
              onFinish={handleSubmit}
              requiredMark={false}
              initialValues={{ recipientUsername: recipientUsername || '' }}
            >
              {/* Duration */}
              <div className='mb-6'>
                <span className='block text-sm font-medium text-gray-200'>How long?</span>
                <p className='mt-0.5 text-xs text-gray-500'>
                  Each month is one month of Dotabod Pro for the recipient.
                </p>
                <div className='mt-3 flex flex-wrap gap-2'>
                  {DURATION_PRESETS.map((months) => {
                    const selected = quantity === months
                    return (
                      <button
                        key={months}
                        type='button'
                        aria-pressed={selected}
                        onClick={() => setQuantity(months)}
                        className={clsx(
                          'rounded-md border px-4 py-2 text-sm font-medium transition-colors duration-200',
                          selected
                            ? 'border-purple-500 bg-purple-500/15 text-purple-200'
                            : 'border-gray-700 bg-gray-800 text-gray-300 hover:border-gray-600 hover:text-gray-100',
                        )}
                      >
                        {months} {months === 1 ? 'month' : 'months'}
                      </button>
                    )
                  })}
                  <div className='flex items-center gap-2 rounded-md border border-gray-700 bg-gray-800 px-3 py-1.5'>
                    <span className='text-xs text-gray-500'>Custom</span>
                    <InputNumber
                      min={1}
                      max={100}
                      value={quantity}
                      onChange={(value) => setQuantity(Number(value) || 1)}
                      controls={false}
                      size='small'
                      style={{ width: 56 }}
                      aria-label='Custom number of months'
                    />
                  </div>
                </div>
              </div>

              <Form.Item
                name='recipientUsername'
                label="Recipient's Twitch username"
                rules={[{ message: "Please enter the recipient's username", required: true }]}
                validateStatus={usernameError ? 'error' : undefined}
                help={usernameError}
              >
                <Input
                  placeholder='Enter Twitch username'
                  disabled={Boolean(recipientUsername)}
                  onChange={handleUsernameChange}
                  className='w-full'
                />
              </Form.Item>

              <Form.Item
                name='giftSenderName'
                label='Your name (optional)'
                tooltip='Shown to the recipient. Leave blank to gift anonymously.'
                rules={[
                  {
                    validator: (_, value) => {
                      if (value && checkForProfanity(value)) {
                        return Promise.reject('Please remove inappropriate language from your name')
                      }
                      return Promise.resolve()
                    },
                  },
                ]}
              >
                <Input
                  placeholder='Your name, or leave blank to gift anonymously'
                  onChange={handleSenderNameChange}
                  className='w-full'
                />
              </Form.Item>

              <Form.Item
                name='giftMessage'
                label='Gift message (optional)'
                tooltip='A personal note shown with your gift.'
                rules={[
                  {
                    validator: (_, value) => {
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
                <div role='alert' className='mb-4 text-sm text-red-300'>
                  {formError}
                </div>
              )}

              {/* Price summary */}
              <div className='rounded-lg border border-gray-700 bg-gray-800/60 p-4'>
                <div className='flex items-center justify-between text-sm text-gray-300'>
                  <span>
                    {quantity} {quantity === 1 ? 'month' : 'months'} of Pro
                  </span>
                  <span className='text-gray-400'>
                    {formatPrice(unitPrice)} × {quantity}
                  </span>
                </div>
                <div className='mt-3 flex items-center justify-between border-t border-gray-700 pt-3'>
                  <span className='text-sm font-medium text-gray-200'>Total, billed once</span>
                  <span className='text-xl font-semibold text-gray-100'>{formatPrice(total)}</span>
                </div>
              </div>

              <Button
                type='primary'
                htmlType='submit'
                loading={isSubmitting}
                size='large'
                block
                disabled={isSubmitting || Boolean(usernameError)}
                className='mt-4'
                icon={<GiftIcon className='h-4 w-4' />}
              >
                Continue to payment · {formatPrice(total)}
              </Button>
              {usernameError && (
                <p className='mt-2 text-center text-xs text-gray-500'>
                  Update the recipient username above to continue.
                </p>
              )}
            </Form>
          </Card>
        </motion.div>

        <motion.div {...fadeUp(0.16)}>
          <div className='lg:sticky lg:top-24'>
            <GiftPreview senderName={senderName} giftMessage={giftMessage} />
          </div>
        </motion.div>
      </div>

      {/* What you're unlocking + how it works */}
      <motion.div {...fadeUp(0.24)} className='mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2 lg:gap-8'>
        <Card className='h-full'>
          <div className='flex items-center gap-2'>
            <SparklesIcon className='h-5 w-5 text-purple-300' aria-hidden />
            <h2 className='text-lg font-medium text-gray-100'>What you're unlocking</h2>
          </div>
          <p className='mt-1 text-sm text-gray-400'>
            Everything in Free, plus the tools streamers actually feel on air.
          </p>
          <ul className='mt-4 space-y-2.5'>
            {PRO_HIGHLIGHTS.map((feature) => (
              <li key={feature} className='flex items-start gap-2.5 text-sm text-gray-300'>
                <span
                  aria-hidden
                  className='mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-purple-400'
                />
                {feature}
              </li>
            ))}
          </ul>
          <p className='mt-4 text-xs text-gray-500'>
            Gift credits apply to monthly Pro, not to lifetime purchases.
          </p>
        </Card>

        <Card className='h-full'>
          <div className='flex items-center gap-2'>
            <GiftIcon className='h-5 w-5 text-purple-300' aria-hidden />
            <h2 className='text-lg font-medium text-gray-100'>How it works</h2>
          </div>
          <ol className='mt-4 space-y-4'>
            {HOW_IT_WORKS.map((step, index) => (
              <li key={step.title} className='flex items-start gap-3'>
                <span className='mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-purple-500/15 text-xs font-semibold text-purple-200'>
                  {index + 1}
                </span>
                <div>
                  <p className='text-sm font-medium text-gray-200'>{step.title}</p>
                  <p className='mt-0.5 text-sm text-gray-400'>{step.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </Card>
      </motion.div>
    </div>
  )
}
