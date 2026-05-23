import { App, Button, Progress, Steps } from 'antd'
import confetti from 'canvas-confetti'
import { Bitcoin } from 'lucide-react'
import Head from 'next/head'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { useSession } from 'next-auth/react'
import { type ReactElement, useCallback, useEffect, useMemo } from 'react'
import useSWR from 'swr'
import ChatBot from '@/components/Dashboard/ChatBot'
import ConnectSteam from '@/components/Dashboard/ConnectSteam'
import DashboardShell from '@/components/Dashboard/DashboardShell'
import ExportCFG from '@/components/Dashboard/ExportCFG'
import Header from '@/components/Dashboard/Header'
import OBSOverlay from '@/components/Dashboard/OBSOverlay'
import { fetcher } from '@/lib/fetcher'
import { useSetupModStatus } from '@/lib/hooks/useSetupModStatus'
import { useSteamLinkedAccount } from '@/lib/hooks/useSteamLinkedAccount'
import { SETTINGS_SWR_OPTIONS } from '@/lib/hooks/useUpdateSetting'
import { requireDashboardAccess } from '@/lib/server/dashboardAccess'
import { SETUP_SIGNAL_KEYS } from '@/lib/setupSignalKeys'
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

type SettingsPayload = {
  stream_online?: boolean
  settings?: { key: string }[]
}

const SetupPage = () => {
  const session = useSession()
  const { notification } = App.useApp()
  const track = useTrack()
  const { data: steamStatus } = useSteamLinkedAccount()
  const steamLinked = Boolean(steamStatus?.linked)
  const { data: modStatus } = useSetupModStatus()
  const modVerified = Boolean(modStatus?.modded)

  // Folded into /api/settings to save one Vercel invocation per poll. The backend writes
  // these rows on first GSI packet / first overlay socket; we only need their existence.
  const { data } = useSWR<SettingsPayload>('/api/settings', fetcher, {
    ...SETTINGS_SWR_OPTIONS,
    refreshInterval: (latest) => {
      const keys = latest?.settings
      const gsi = keys?.some((s) => s.key === SETUP_SIGNAL_KEYS.gsi)
      const overlay = keys?.some((s) => s.key === SETUP_SIGNAL_KEYS.overlay)
      return gsi && overlay ? 0 : 10000
    },
  })
  const isLive = Boolean(data?.stream_online)
  const settingKeySet = useMemo(
    () => new Set(data?.settings?.map((s) => s.key) ?? []),
    [data?.settings],
  )
  const gsiVerified = settingKeySet.has(SETUP_SIGNAL_KEYS.gsi)
  const overlayVerified = settingKeySet.has(SETUP_SIGNAL_KEYS.overlay)

  const signals: { done: boolean; label: string }[] = [
    { done: modVerified, label: 'Twitch mod' },
    { done: gsiVerified, label: 'Game data' },
    { done: overlayVerified, label: 'Overlay' },
    { done: steamLinked, label: 'Steam' },
  ]
  const completedSignals = signals.filter((s) => s.done)

  const router = useRouter()
  const maxStepIndex = 3
  const active = useMemo(() => {
    const parsedStep = Number.parseInt(router.query.step as string, 10)
    return !Number.isNaN(parsedStep) && parsedStep > 0 ? Math.min(parsedStep - 1, maxStepIndex) : 0
  }, [router.query.step])
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
    (newActiveStep: number) => {
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
    const next = active < maxStepIndex ? active + 1 : active
    updateStepInUrl(next)
    track('setup/next_step', { from: active, to: next })
  }, [active, updateStepInUrl, track])

  const prevStep = useCallback(() => {
    const prev = active > 0 ? active - 1 : active
    updateStepInUrl(prev)
    track('setup/prev_step', { from: active, to: prev })
  }, [active, updateStepInUrl, track])

  // Standard confetti animation
  const triggerConfetti = useCallback(() => {
    const end = Date.now() + 2 * 1000
    const colors = ['#a786ff', '#fd8bbc', '#eca184', '#f8deb1']

    const frame = () => {
      if (Date.now() > end) return

      confetti({
        particleCount: 3,
        angle: 60,
        spread: 55,
        startVelocity: 60,
        origin: { x: 0, y: 0.5 },
        colors: colors,
      })
      confetti({
        particleCount: 3,
        angle: 120,
        spread: 55,
        startVelocity: 60,
        origin: { x: 1, y: 0.5 },
        colors: colors,
      })

      requestAnimationFrame(frame)
    }

    frame()
  }, [])

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

  useEffect(() => {
    if (didJustPay) {
      if (paidWithCrypto) {
        triggerCryptoConfetti()
      } else {
        triggerConfetti()
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
    didJustPay,
    isTrial,
    notification,
    router,
    trialDays,
    triggerConfetti,
    hasGiftSubs,
    giftCount,
    paidWithCrypto,
    CryptoSuccessContent,
  ])

  if (session?.data?.user?.isImpersonating) {
    return null
  }

  const steps = [
    {
      title: 'Stream',
      content: <ChatBot />,
      description: 'Connect your stream',
      status: modVerified ? ('finish' as const) : undefined,
    },
    {
      title: 'Dota 2',
      content: <ExportCFG />,
      description: 'Configure game settings',
      status: gsiVerified ? ('finish' as const) : undefined,
    },
    {
      title: 'OBS',
      content: <OBSOverlay />,
      description: 'Set up your overlay',
      status: overlayVerified ? ('finish' as const) : undefined,
    },
    {
      title: 'Connect Steam',
      description: 'Auto-connects when you play',
      status: steamLinked ? ('finish' as const) : undefined,
      content: <ConnectSteam isLive={isLive} />,
    },
  ]

  const NavigationButtons = (
    <div className='flex justify-between mx-auto'>
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

      <div className='mb-4'>
        <Progress
          percent={Math.round((completedSignals.length / signals.length) * 100)}
          showInfo={false}
        />
        {completedSignals.length > 0 && (
          <p className='text-xs text-gray-500 mt-1'>
            {completedSignals.map((s) => `${s.label} verified`).join(', ')}
          </p>
        )}
      </div>

      <Steps
        current={active}
        onChange={(newActiveStep) => {
          updateStepInUrl(newActiveStep)
          track('setup/change_step', { step: newActiveStep })
        }}
        items={steps}
        className='flex justify-center mb-8!'
      />

      {NavigationButtons}

      <div className='mb-10'>{steps[active].content}</div>

      {NavigationButtons}
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
