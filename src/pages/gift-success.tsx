import confetti from 'canvas-confetti'
import { motion, useReducedMotion } from 'framer-motion'
import { ArrowRightIcon, CheckIcon, ClockIcon, GiftIcon } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import type { ReactElement } from 'react'
import { useEffect, useState } from 'react'
import HomepageShell from '@/components/Homepage/HomepageShell'
import TwitchChat from '@/components/TwitchChat'
import type { NextPageWithLayout } from '@/pages/_app'
import { Card } from '@/ui/card'

const NEXT_STEPS = [
  'The recipient gets a notification in their Twitch chat.',
  "New to Pro? They set up a subscription and your credits cover the gifted months, so they aren't charged until those run out.",
  'Already a Pro subscriber? Your credits stack onto their account and extend how long they keep Pro.',
]

const GiftSuccessPage: NextPageWithLayout = () => {
  const router = useRouter()
  const { recipient, senderName, quantity, giftMessage } = router.query
  const [hasCelebrated, setHasCelebrated] = useState(false)
  const reduceMotion = useReducedMotion()

  // Parse quantity to a number (default to 1 if undefined or invalid)
  const parsedQuantity = Number.parseInt(quantity as string, 10) || 1
  const formattedSenderName = (senderName as string) || 'Anonymous'
  const formattedGiftMessage = (giftMessage as string) || ''

  const fadeUp = (delay: number) => ({
    initial: reduceMotion ? false : { opacity: 0, y: 14 },
    animate: { opacity: 1, y: 0 },
    transition: { delay, duration: 0.5, ease: [0.22, 1, 0.36, 1] as const },
  })

  // Trigger confetti when the page loads, unless the user prefers reduced motion.
  useEffect(() => {
    if (typeof window === 'undefined' || reduceMotion || hasCelebrated) {
      return
    }
    setHasCelebrated(true)

    const duration = 3 * 1000
    const end = Date.now() + duration
    const colors = ['#a855f7', '#c084fc', '#7c3aed']

    const frame = () => {
      void confetti({ angle: 60, colors, origin: { x: 0 }, particleCount: 2, spread: 55 })
      void confetti({ angle: 120, colors, origin: { x: 1 }, particleCount: 2, spread: 55 })
      if (Date.now() < end) {
        requestAnimationFrame(frame)
      }
    }
    frame()
  }, [hasCelebrated, reduceMotion])

  // Create gift message preview for Twitch chat
  const giftChatMessage = (
    <>
      {formattedSenderName === 'Anonymous' ? (
        <span>A gift sub for Dotabod Pro was just gifted anonymously!</span>
      ) : (
        <span>
          A gift sub for Dotabod Pro was just gifted by{' '}
          <span className='font-semibold text-purple-400'>{formattedSenderName}</span>!
        </span>
      )}
    </>
  )

  return (
    <div className='mx-auto w-full max-w-3xl px-4 pb-20 md:px-6'>
      <motion.header {...fadeUp(0)} className='pt-16 text-center'>
        <div className='mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-purple-500/15 ring-1 ring-purple-500/30'>
          <CheckIcon className='h-8 w-8 text-purple-300' aria-hidden />
        </div>
        <h1 className='mt-6 text-balance text-4xl font-semibold tracking-tight text-gray-100 sm:text-5xl'>
          Your gift is on its way
        </h1>
        <p className='mx-auto mt-4 max-w-lg text-pretty text-lg text-gray-400'>
          {recipient ? (
            <>
              You gifted <span className='font-medium text-gray-200'>{parsedQuantity}</span>{' '}
              {parsedQuantity === 1 ? 'month' : 'months'} of Dotabod Pro to{' '}
              <span className='font-medium text-gray-200'>{recipient}</span>. They'll be notified
              shortly.
            </>
          ) : (
            <>
              You gifted {parsedQuantity} {parsedQuantity === 1 ? 'month' : 'months'} of Dotabod
              Pro. The recipient will be notified shortly.
            </>
          )}
        </p>
      </motion.header>

      <motion.div {...fadeUp(0.08)} className='mt-10 grid grid-cols-1 gap-6 md:grid-cols-2'>
        <Card>
          <div className='flex items-center gap-2'>
            <GiftIcon className='h-5 w-5 text-purple-300' aria-hidden />
            <h2 className='text-lg font-medium text-gray-100'>Gift details</h2>
          </div>
          <dl className='mt-4 space-y-3 text-sm'>
            <div className='flex justify-between gap-3'>
              <dt className='text-gray-500'>Recipient</dt>
              <dd className='text-gray-200'>{recipient || 'Not specified'}</dd>
            </div>
            <div className='flex justify-between gap-3'>
              <dt className='text-gray-500'>From</dt>
              <dd className='text-gray-200'>{formattedSenderName}</dd>
            </div>
            <div className='flex justify-between gap-3'>
              <dt className='text-gray-500'>Duration</dt>
              <dd className='text-gray-200'>
                {parsedQuantity} {parsedQuantity === 1 ? 'month' : 'months'} of Pro
              </dd>
            </div>
            {formattedGiftMessage && (
              <div className='flex justify-between gap-3'>
                <dt className='text-gray-500'>Message</dt>
                <dd className='text-right italic text-gray-300'>"{formattedGiftMessage}"</dd>
              </div>
            )}
          </dl>
        </Card>

        <Card>
          <div className='flex items-center gap-2'>
            <ClockIcon className='h-5 w-5 text-amber-300' aria-hidden />
            <h2 className='text-lg font-medium text-gray-100'>Good to know</h2>
          </div>
          <div className='mt-4 space-y-3 text-sm text-gray-400'>
            <p>
              The notification can take{' '}
              <span className='font-medium text-gray-200'>1 to 3 minutes</span> to reach the
              recipient's Twitch chat.
            </p>
            <p>If they're live right now, your gift will show up on stream shortly.</p>
          </div>
        </Card>
      </motion.div>

      <motion.div {...fadeUp(0.16)} className='mt-6'>
        <Card>
          <h2 className='text-lg font-medium text-gray-100'>How it'll appear</h2>
          <div className='mt-4'>
            <span className='mb-2 block text-xs font-medium uppercase tracking-[0.2em] text-gray-500'>
              Twitch chat
            </span>
            <TwitchChat responses={[giftChatMessage]} />
          </div>
        </Card>
      </motion.div>

      <motion.div {...fadeUp(0.24)} className='mt-6'>
        <Card>
          <h2 className='text-lg font-medium text-gray-100'>What happens next</h2>
          <ol className='mt-4 space-y-3'>
            {NEXT_STEPS.map((step, index) => (
              <li key={step} className='flex items-start gap-3 text-sm text-gray-300'>
                <span className='mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-purple-500/15 text-xs font-semibold text-purple-200'>
                  {index + 1}
                </span>
                <span className='text-gray-400'>{step}</span>
              </li>
            ))}
          </ol>
        </Card>
      </motion.div>

      <motion.div {...fadeUp(0.32)} className='mt-8 flex flex-col justify-center gap-3 sm:flex-row'>
        <Link
          href='/gift'
          className='inline-flex items-center justify-center gap-2 rounded-md border border-gray-700 bg-gray-800 px-4 py-2 text-sm font-medium text-gray-200 transition-colors duration-200 hover:border-gray-600 hover:text-purple-300'
        >
          <GiftIcon className='h-4 w-4' aria-hidden />
          Send another gift
        </Link>
        <Link
          href='/'
          className='inline-flex items-center justify-center gap-2 rounded-md bg-purple-900 px-4 py-2 text-sm font-medium text-gray-100 transition-colors duration-200 hover:bg-purple-800'
        >
          Back to Dotabod
          <ArrowRightIcon className='h-4 w-4' aria-hidden />
        </Link>
      </motion.div>
    </div>
  )
}

GiftSuccessPage.getLayout = function getLayout(page: ReactElement) {
  return (
    <HomepageShell
      ogImage={{
        subtitle: 'Your gift has been sent successfully.',
        title: 'Gift Sent Successfully',
      }}
      seo={{
        canonicalUrl: 'https://dotabod.com/gift-success',
        description: 'Your gift has been sent successfully.',
        noindex: true,
        title: 'Gift Sent Successfully | Dotabod',
      }}
    >
      {page}
    </HomepageShell>
  )
}

export default GiftSuccessPage
