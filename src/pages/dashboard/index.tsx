import { App, Button } from 'antd'
import confetti from 'canvas-confetti'
import { Bitcoin } from 'lucide-react'
import Head from 'next/head'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { useSession } from 'next-auth/react'
import { type ReactElement, useCallback, useEffect, useState } from 'react'
import useSWR from 'swr'
import ChatBot from '@/components/Dashboard/ChatBot'
import DashboardShell from '@/components/Dashboard/DashboardShell'
import ExportCFG from '@/components/Dashboard/ExportCFG'
import Header from '@/components/Dashboard/Header'
import OBSOverlay from '@/components/Dashboard/OBSOverlay'
import {
  SetupProgressShell,
  type SetupStepProgressState,
} from '@/components/Dashboard/SetupProgressShell'
import { SteamConnectStep } from '@/components/Dashboard/SteamConnectStep'
import { fetcher } from '@/lib/fetcher'
import { SETTINGS_SWR_OPTIONS } from '@/lib/hooks/useUpdateSetting'
import { requireDashboardAccess } from '@/lib/server/dashboardAccess'
import { useTrack } from '@/lib/track'
import { GRACE_PERIOD_END, isInGracePeriod } from '@/utils/subscription'

// Custom crypto confetti function
const triggerCryptoConfetti = () => {
  const end = Date.now() + 3 * 1000
  // Crypto-themed colors - purples and golds
  const colors = ['#8b5cf6', '#a78bfa', '#f59e0b', '#fbbf24']

  const frame = () => {
    if (Date.now() > end) return

    // More particles for crypto
    confetti({
      particleCount: 6,
      angle: 60,
      spread: 70,
      startVelocity: 75,
      origin: { x: 0, y: 0.5 },
      colors: colors,
      shapes: ['circle', 'square'],
      scalar: 1.2,
    })
    confetti({
      particleCount: 6,
      angle: 120,
      spread: 70,
      startVelocity: 75,
      origin: { x: 1, y: 0.5 },
      colors: colors,
      shapes: ['circle', 'square'],
      scalar: 1.2,
    })

    // Add some "bitcoin" shaped confetti (smaller circles) in gold
    confetti({
      particleCount: 4,
      angle: 90,
      spread: 360,
      startVelocity: 40,
      origin: { x: 0.5, y: 0.5 },
      colors: ['#f59e0b', '#fbbf24'],
      shapes: ['circle'],
      scalar: 0.7,
    })

    requestAnimationFrame(frame)
  }

  frame()
}

const SetupPage = () => {
  const session = useSession()
  const { notification } = App.useApp()
  const track = useTrack()
  const { data } = useSWR('/api/settings', fetcher, SETTINGS_SWR_OPTIONS)
  const isLive = data?.stream_online

  const [active, setActive] = useState(0)
  const [stepProgress, setStepProgress] = useState<Record<number, SetupStepProgressState>>({})
  const router = useRouter()
  const didJustPay = router.query.paid === 'true'
  // Check if payment was made with crypto
  const paidWithCrypto = router.query.crypto === 'true'
  // isTrial comes from the checkout API's success URL: ?trial=${isRecurring && trialDays > 0}
  // It will be true for recurring subscriptions with a trial period (grace period or standard 14-day trial)
  // It will be false for lifetime purchases or subscriptions with no trial (like when a user already has a gift sub)
  const isTrial = router.query.trial === 'true'

  // Get trial days directly from URL query params if available, otherwise calculate
  const trialDays = (() => {
    // If trial days are provided in the URL (from checkout success redirect), use that
    const trialDaysFromUrl = router.query.trialDays
      ? Number.parseInt(router.query.trialDays as string, 10)
      : null
    if (trialDaysFromUrl !== null && !Number.isNaN(trialDaysFromUrl)) {
      return trialDaysFromUrl
    }

    // Otherwise calculate based on grace period
    if (isInGracePeriod()) {
      return Math.ceil((GRACE_PERIOD_END.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    }

    // Default to standard 14 days trial
    return 14
  })()

  // Get gift information from URL query params
  const hasGiftSubs = router.query.hasGifts === 'true'
  const giftCount = router.query.giftCount
    ? Number.parseInt(router.query.giftCount as string, 10)
    : 0

  const updateStepInUrl = useCallback(
    (newActiveStep) => {
      // Update the URL without adding a new history entry
      router.replace(
        {
          pathname: router.pathname,
          query: { ...router.query, step: newActiveStep + 1 }, // +1 to make it 1-indexed for the URL
        },
        undefined,
        { shallow: true },
      ) // `shallow: true` to not trigger data fetching methods again
    },
    [router],
  )

  const nextStep = useCallback(() => {
    setActive((current) => {
      const nextStep = current < 3 ? current + 1 : current
      updateStepInUrl(nextStep)
      track('setup/next_step', { from: current, to: nextStep })
      return nextStep
    })
  }, [updateStepInUrl, track])

  const prevStep = useCallback(() => {
    setActive((current) => {
      const prevStep = current > 0 ? current - 1 : current
      updateStepInUrl(prevStep)
      track('setup/prev_step', { from: current, to: prevStep })
      return prevStep
    })
  }, [updateStepInUrl, track])

  const maxStepIndex = 3

  const updateStepProgress = useCallback((stepIndex: number, progress: SetupStepProgressState) => {
    setStepProgress((previousProgress) => {
      const previousStepProgress = previousProgress[stepIndex]

      if (
        previousStepProgress &&
        previousStepProgress.label === progress.label &&
        previousStepProgress.detail === progress.detail &&
        previousStepProgress.completedCount === progress.completedCount &&
        previousStepProgress.totalCount === progress.totalCount &&
        previousStepProgress.isComplete === progress.isComplete &&
        previousStepProgress.needsAttention === progress.needsAttention
      ) {
        return previousProgress
      }

      return {
        ...previousProgress,
        [stepIndex]: progress,
      }
    })
  }, [])

  const handleStreamProgressChange = useCallback(
    (progress: SetupStepProgressState) => updateStepProgress(0, progress),
    [updateStepProgress],
  )

  const handleDotaProgressChange = useCallback(
    (progress: SetupStepProgressState) => updateStepProgress(1, progress),
    [updateStepProgress],
  )

  const handleObsProgressChange = useCallback(
    (progress: SetupStepProgressState) => updateStepProgress(2, progress),
    [updateStepProgress],
  )

  const handleSteamProgressChange = useCallback(
    (progress: SetupStepProgressState) => updateStepProgress(3, progress),
    [updateStepProgress],
  )

  useEffect(() => {
    const parsedStep = Number.parseInt(router.query.step as string, 10)

    setActive(
      !Number.isNaN(parsedStep) && parsedStep > 0 ? Math.min(parsedStep - 1, maxStepIndex) : 0,
    )
  }, [router.query.step])

  // Crypto notification element with animations
  const CryptoSuccessContent = useCallback(
    ({ message, description }: { message: string; description: string }) => (
      <div className='crypto-success-notification animate-glow'>
        <div className='flex items-center'>
          <Bitcoin className='mr-2 text-amber-400 animate-spin-slow' size={24} />
          <div className='crypto-gradient-text font-bold text-lg'>{message}</div>
        </div>
        <div className='mt-2 pl-8'>{description}</div>
        <div className='absolute top-0 left-0 w-full h-full crypto-active-bg pointer-events-none' />
      </div>
    ),
    [],
  )

  // Consolidated useEffect for confetti and payment notifications
  useEffect(() => {
    // User just completed a payment
    if (didJustPay) {
      if (paidWithCrypto) {
        triggerCryptoConfetti()
      } else {
        confetti({
          particleCount: 90,
          spread: 60,
          startVelocity: 45,
          origin: { x: 0.5, y: 0.3 },
          colors: ['#a786ff', '#fd8bbc', '#eca184', '#f8deb1'],
        })
      }

      // Create a more descriptive message based on the subscription type
      let description = ''
      if (isTrial) {
        if (hasGiftSubs && trialDays > 14) {
          // Case: User has gift subscriptions and is now self-subscribing
          description = `Your subscription is active! You won't be charged until your gift subscription${giftCount > 1 ? 's' : ''} ${giftCount > 1 ? 'expire' : 'expires'} in ${trialDays} days.`
        } else {
          // Standard trial case
          description = `Your ${trialDays > 0 ? `${trialDays}-day trial` : 'subscription'} with full access to all features begins now.`
        }
      } else {
        // Lifetime or no trial case
        description = 'Thanks for supporting Dotabod! All premium features are now unlocked.'
      }

      // Special notification styling for crypto payments
      if (paidWithCrypto) {
        notification.open({
          key: 'paid',
          message: '',
          description: (
            <CryptoSuccessContent
              message='Dotabod Pro Unlocked with Crypto'
              description={description}
            />
          ),
          duration: 55,
          className: 'crypto-notification',
        })

        // Add body class for temporary crypto theme
        document.body.classList.add('crypto-payment-success')
        setTimeout(() => {
          document.body.classList.remove('crypto-payment-success')
        }, 60000) // Remove after 1 minute
      } else {
        notification.success({
          key: 'paid',
          message: 'Dotabod Pro Unlocked',
          description,
          duration: 55,
        })
      }

      // Clear the query params but preserve the step
      const step = router.query.step
      router.replace(
        {
          pathname: router.pathname,
          query: step ? { step } : {},
        },
        undefined,
        { shallow: true },
      )
    }
  }, [
    active,
    didJustPay,
    isTrial,
    notification,
    router,
    trialDays,
    hasGiftSubs,
    giftCount,
    paidWithCrypto,
    CryptoSuccessContent,
  ])

  const steps = [
    {
      title: 'Stream',
      content: <ChatBot onProgressChange={handleStreamProgressChange} />,
      description: 'Connect your stream',
      progress: stepProgress[0],
    },
    {
      title: 'Dota 2',
      content: <ExportCFG onProgressChange={handleDotaProgressChange} />,
      description: 'Configure game settings',
      progress: stepProgress[1],
    },
    {
      title: 'OBS',
      content: <OBSOverlay onProgressChange={handleObsProgressChange} />,
      description: 'Set up your overlay',
      progress: stepProgress[2],
    },
    {
      title: 'Connect Steam',
      description: 'Auto-connects when you play',
      content: <SteamConnectStep isLive={isLive} onProgressChange={handleSteamProgressChange} />,
      progress: stepProgress[3],
    },
  ]

  useEffect(() => {
    track('setup/progress_viewed', { step: active, totalSteps: steps.length })
  }, [track, active, steps.length])

  const isSetupComplete = steps.every((step) => step.progress?.isComplete)

  if (session?.data?.user?.isImpersonating) {
    return null
  }

  const handleProgressStepChange = (newActiveStep: number) => {
    setActive(newActiveStep)
    updateStepInUrl(newActiveStep)
    track('setup/change_step', { step: newActiveStep })
  }

  const NavigationButtons = (
    <div className='flex justify-between gap-4'>
      <div>
        {active > 0 && (
          <Button size='large' onClick={prevStep}>
            <span className='mr-1'>←</span> Back
          </Button>
        )}
      </div>

      <div>
        {active === steps.length - 1 ? (
          <Link href='/dashboard/features'>
            <Button size='large' type='primary'>
              View features <span className='ml-1'>→</span>
            </Button>
          </Link>
        ) : (
          <Button size='large' type='primary' onClick={nextStep}>
            Next step <span className='ml-1'>→</span>
          </Button>
        )}
      </div>
    </div>
  )
  return (
    <>
      <Head>
        <title>Dotabod | Setup</title>
      </Head>
      <Header
        subtitle={
          <div>
            Let&apos;s get Dotabod working for you right away{' '}
            <Image
              src='/images/emotes/peepoclap.webp'
              width={30}
              unoptimized
              className='inline'
              height={30}
              alt='peepo clap'
            />
          </div>
        }
        title='Setup'
      />

      <div className='mb-10 space-y-4'>
        <SetupProgressShell
          activeStep={active}
          className='mb-0'
          isSetupComplete={isSetupComplete}
          onStepChange={handleProgressStepChange}
          steps={steps}
        />

        <div className='overflow-hidden rounded-[1.75rem] border border-gray-800/80 bg-black/20 shadow-[0_18px_70px_rgba(0,0,0,0.22)]'>
          <div>{steps[active].content}</div>

          <div className='border-t border-gray-800/80 bg-gray-950/40 px-4 py-4 md:px-6'>
            {NavigationButtons}
          </div>
        </div>
      </div>
    </>
  )
}

SetupPage.getLayout = function getLayout(page: ReactElement) {
  return (
    <DashboardShell
      seo={{
        title: 'Dashboard | Dotabod',
        description:
          'Manage your Dotabod settings and features to enhance your Dota 2 streaming experience.',
        canonicalUrl: 'https://dotabod.com/dashboard',
        noindex: true,
      }}
    >
      {page}
    </DashboardShell>
  )
}

export const getServerSideProps = requireDashboardAccess()

export default SetupPage
