import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import { GiftIcon, ArrowRightIcon, ClockIcon, CakeIcon } from 'lucide-react'
import Link from 'next/link'
import confetti from 'canvas-confetti'
import { Typography } from 'antd'
import type { NextPageWithLayout } from '@/pages/_app'
import HomepageShell from '@/components/Homepage/HomepageShell'
import type { ReactElement } from 'react'
import TwitchChat from '@/components/TwitchChat'
import GiftSubscriptionAlert from '@/components/Overlay/GiftAlert/GiftSubscriptionAlert'
import { Card } from '@/ui/card'

const { Paragraph } = Typography

const GiftSuccessPage: NextPageWithLayout = () => {
  const router = useRouter()
  const { recipient, senderName, quantity, giftMessage } = router.query
  const [showConfetti, setShowConfetti] = useState(false)

  // Parse quantity to a number (default to 1 if undefined or invalid)
  const parsedQuantity = Number.parseInt(quantity as string, 10) || 1
  const formattedSenderName = (senderName as string) || 'Anonymous'
  const formattedGiftMessage = (giftMessage as string) || ''

  // Trigger confetti effect when the page loads
  useEffect(() => {
    if (typeof window !== 'undefined' && !showConfetti) {
      setShowConfetti(true)

      // Create a confetti effect
      const duration = 3 * 1000
      const end = Date.now() + duration

      const frame = () => {
        confetti({
          particleCount: 2,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors: ['#5D5FEF', '#3F83F8', '#10B981'],
        })

        confetti({
          particleCount: 2,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors: ['#5D5FEF', '#3F83F8', '#10B981'],
        })

        if (Date.now() < end) {
          requestAnimationFrame(frame)
        }
      }

      frame()
    }
  }, [showConfetti])

  // Create gift message preview for Twitch chat
  const giftChatMessage = (
    <>
      {formattedSenderName === 'Anonymous' ? (
        <span>A gift sub for Dotabod Pro was just gifted anonymously!</span>
      ) : (
        <span>
          A gift sub for Dotabod Pro was just gifted by{' '}
          <span className='text-purple-400 font-semibold'>{formattedSenderName}</span>!
        </span>
      )}
    </>
  )

  return (
    <div className='container mx-auto flex max-w-3xl flex-col items-center py-16 text-center'>
      <div className='mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-purple-100'>
        <GiftIcon className='h-10 w-10 text-purple-600' />
      </div>

      <h1 className='mb-3 text-3xl font-bold'>Gift Sent Successfully!</h1>

      <p className='mb-8 max-w-lg text-muted-foreground'>
        {recipient ? (
          <>
            Your gift subscription to{' '}
            <span className='font-medium text-foreground'>{recipient}</span> has been sent
            successfully. They'll be notified about your generous gift!
          </>
        ) : (
          <>
            Your gift subscription has been sent successfully. The recipient will be notified about
            your generous gift!
          </>
        )}
      </p>

      <div className='grid grid-cols-1 md:grid-cols-2 gap-6 w-full mb-8'>
        <Card className='p-6'>
          <div className='flex items-center gap-3 mb-4'>
            <GiftIcon className='h-5 w-5 text-primary' />
            <h2 className='text-lg font-medium'>Gift Details</h2>
          </div>

          <div className='space-y-4 text-left'>
            <div className='flex items-start gap-2'>
              <span className='font-medium min-w-28'>Recipient:</span>
              <span>{recipient || 'Not specified'}</span>
            </div>

            <div className='flex items-start gap-2'>
              <span className='font-medium min-w-28'>From:</span>
              <span>{formattedSenderName}</span>
            </div>

            <div className='flex items-start gap-2'>
              <span className='font-medium min-w-28'>Duration:</span>
              <span>
                {parsedQuantity} {parsedQuantity === 1 ? 'month' : 'months'} of Dotabod Pro
              </span>
            </div>

            {formattedGiftMessage && (
              <div className='flex items-start gap-2'>
                <span className='font-medium min-w-28'>Message:</span>
                <span className='italic'>"{formattedGiftMessage}"</span>
              </div>
            )}
          </div>
        </Card>

        <Card className='p-6'>
          <div className='flex items-center gap-3 mb-4'>
            <ClockIcon className='h-5 w-5 text-amber-500' />
            <h2 className='text-lg font-medium'>Important Note</h2>
          </div>

          <div className='space-y-4 text-left'>
            <p>
              The gift notification may take <span className='font-medium'>1-3 minutes</span> to
              appear on the recipient's stream overlay and in their Twitch chat.
            </p>
            <p>If the recipient is streaming right now, they'll see your gift shortly!</p>
          </div>
        </Card>
      </div>

      <div className='mb-8 w-full'>
        <Card className='p-6'>
          <div className='flex items-center gap-3 mb-4'>
            <CakeIcon className='h-5 w-5 text-purple-500' />
            <h2 className='text-lg font-medium'>Gift Preview</h2>
          </div>

          <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
            <div>
              <h3 className='text-left text-base font-medium mb-2'>Twitch Chat</h3>
              <TwitchChat responses={[giftChatMessage]} />
            </div>

            <div>
              <h3 className='text-left text-base font-medium mb-2'>Stream Overlay</h3>
              <div className='rounded-md bg-gray-800 p-4 flex items-center justify-center'>
                <div className='relative h-48 overflow-hidden flex items-center justify-center'>
                  <GiftSubscriptionAlert
                    senderName={formattedSenderName}
                    giftType='monthly'
                    giftQuantity={parsedQuantity}
                    giftMessage={formattedGiftMessage}
                    preview={true}
                    className='scale-75'
                  />
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>

      <Card className='mb-8'>
        <div className='flex items-center gap-3'>
          <GiftIcon className='h-5 w-5 text-primary' />
          <h2 className='text-lg font-medium'>What happens next?</h2>
        </div>

        <ul className='mt-4 space-y-3 text-left'>
          <li className='flex items-start gap-3'>
            <div className='mt-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary'>
              1
            </div>
            <span>
              The recipient will receive a notification about your gift in their Twitch chat and
              stream overlay.
            </span>
          </li>
          <li className='flex items-start gap-3'>
            <div className='mt-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary'>
              2
            </div>
            <span>
              If the recipient has never subscribed to Dotabod Pro, they will need to set up a
              subscription after receiving your gift. The credits will be automatically applied, so
              they won't be charged for the duration of your gift.
            </span>
          </li>
          <li className='flex items-start gap-3'>
            <div className='mt-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary'>
              3
            </div>
            <span>
              If the recipient is already a Pro subscriber, the gift credits will automatically be
              applied to their account and used when their subscription renews.
            </span>
          </li>
        </ul>
      </Card>

      <div className='flex flex-col gap-4 sm:flex-row'>
        <Link
          href='/gift'
          className='inline-flex items-center justify-center gap-2 rounded-md border bg-card px-4 py-2 text-sm font-medium shadow-sm hover:bg-accent'
        >
          <GiftIcon className='h-4 w-4' />
          Send Another Gift
        </Link>

        <Link
          href='/'
          className='inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90'
        >
          Return to Dashboard
          <ArrowRightIcon className='h-4 w-4' />
        </Link>
      </div>
    </div>
  )
}

GiftSuccessPage.getLayout = function getLayout(page: ReactElement) {
  return (
    <HomepageShell
      seo={{
        title: 'Gift Sent Successfully | Dotabod',
        description: 'Your gift has been sent successfully.',
        canonicalUrl: 'https://dotabod.com/gift-success',
        noindex: true,
      }}
    >
      {page}
    </HomepageShell>
  )
}

export default GiftSuccessPage
