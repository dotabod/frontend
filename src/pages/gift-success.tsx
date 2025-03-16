import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import { GiftIcon, CheckCircle2Icon, ArrowRightIcon } from 'lucide-react'
import Link from 'next/link'
import confetti from 'canvas-confetti'
import { Typography } from 'antd'
import type { NextPageWithLayout } from '@/pages/_app'
import HomepageShell from '@/components/Homepage/HomepageShell'
import type { ReactElement } from 'react'

const { Paragraph } = Typography

const GiftSuccessPage: NextPageWithLayout = () => {
  const router = useRouter()
  const { recipient } = router.query
  const [showConfetti, setShowConfetti] = useState(false)

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

  return (
    <div className='container mx-auto flex max-w-3xl flex-col items-center py-16 text-center'>
      <div className='mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-green-100'>
        <CheckCircle2Icon className='h-10 w-10 text-green-600' />
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

      <div className='mb-12 rounded-lg border bg-card p-6 shadow-sm'>
        <div className='flex items-center gap-3'>
          <GiftIcon className='h-5 w-5 text-primary' />
          <h2 className='text-lg font-medium'>What happens next?</h2>
        </div>

        <ul className='mt-4 space-y-3 text-left'>
          <li className='flex items-start gap-3'>
            <div className='mt-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary'>
              1
            </div>
            <span>The recipient will receive a notification about your gift.</span>
          </li>
          <li className='flex items-start gap-3'>
            <div className='mt-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary'>
              2
            </div>
            <span>
              Their Pro subscription will be activated immediately or extended if they already have
              one.
            </span>
          </li>
          <li className='flex items-start gap-3'>
            <div className='mt-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary'>
              3
            </div>
            <span>They'll have access to all Pro features for the duration of your gift.</span>
          </li>
        </ul>
      </div>

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
