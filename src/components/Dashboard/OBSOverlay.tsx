import { QuestionCircleOutlined } from '@ant-design/icons'
import { CopyButton } from '@mantine/core'
import { Button, Tag } from 'antd'
import clsx from 'clsx'
import { CrownIcon, SparklesIcon } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { useSession } from 'next-auth/react'
import { useEffect, useState } from 'react'
import { useFeatureAccess } from '@/hooks/useSubscription'
import { useBaseUrl } from '@/lib/hooks/useBaseUrl'
import { useTrack } from '@/lib/track'
import { Card } from '@/ui/card'
import { ObsSetup } from './ObsSetup'
import RegionalBlockingNote from './RegionalBlockingNote'
import type { SetupStepProgressState } from './SetupProgressShell'
import { SetupStatusPill, SetupStepHeader, SetupStepPanel } from './SetupStepHeader'

type OverlayType = 'auto' | 'text' | 'video'

function PremiumChip({ included }: { included: boolean }) {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em]',
        included
          ? 'border-amber-400/35 bg-amber-500/12 text-amber-200'
          : 'border-violet-400/30 bg-violet-500/12 text-violet-200',
      )}
    >
      <CrownIcon className='h-3 w-3' />
      {included ? 'Included in Pro' : 'Pro'}
    </span>
  )
}

function SetupModeButton({
  badge,
  description,
  isActive,
  onClick,
  title,
}: {
  badge?: React.ReactNode
  description: string
  isActive: boolean
  onClick: () => void
  title: string
}) {
  return (
    <button
      className={clsx(
        'rounded-2xl border p-4 text-left transition-all duration-200',
        isActive
          ? 'border-violet-500/45 bg-violet-950/35 shadow-[0_0_0_1px_rgba(139,92,246,0.12)]'
          : 'border-gray-800 bg-gray-950/60 hover:border-gray-700 hover:bg-gray-900/70',
      )}
      onClick={onClick}
      type='button'
    >
      <div className='flex items-start justify-between gap-3'>
        <div>
          <div className='flex flex-wrap items-center gap-2'>
            <p className='text-sm font-semibold text-white'>{title}</p>
            {badge}
          </div>
          <p className='mt-2 text-sm leading-relaxed text-gray-400'>{description}</p>
        </div>
        {isActive ? <SparklesIcon className='mt-0.5 h-4 w-4 text-violet-200' /> : null}
      </div>
    </button>
  )
}

function SetupModeSelector({
  automaticBadge,
  automaticDescription,
  manualDescription,
  onAutomaticSelect,
  onManualSelect,
  value,
}: {
  automaticBadge?: React.ReactNode
  automaticDescription: string
  manualDescription: string
  onAutomaticSelect: () => void
  onManualSelect: () => void
  value: OverlayType
}) {
  const isManualMode = value !== 'auto'

  return (
    <div className='mb-5 rounded-2xl border border-gray-800/80 bg-black/20 p-2'>
      <div className='grid gap-2 lg:grid-cols-2'>
        <SetupModeButton
          badge={automaticBadge}
          description={automaticDescription}
          isActive={!isManualMode}
          onClick={onAutomaticSelect}
          title='Automatic setup'
        />
        <SetupModeButton
          description={manualDescription}
          isActive={isManualMode}
          onClick={onManualSelect}
          title='Manual setup'
        />
      </div>
    </div>
  )
}

function PremiumAutomationCard({
  bullets,
  ctaLabel,
  description,
}: {
  bullets: string[]
  ctaLabel: string
  description: string
}) {
  return (
    <div className='rounded-2xl border border-violet-500/30 bg-[radial-gradient(ellipse_at_top,rgba(139,92,246,0.16),rgba(2,6,23,0.2)_60%)] p-5 shadow-[0_16px_50px_rgba(76,29,149,0.12)]'>
      <div className='flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between'>
        <div className='max-w-2xl'>
          <div className='mb-2 flex flex-wrap items-center gap-2'>
            <PremiumChip included={false} />
            <span className='text-xs uppercase tracking-[0.18em] text-violet-200/80'>
              Premium setup path
            </span>
          </div>
          <p className='text-base font-semibold text-white'>Automatic setup is available on Pro</p>
          <p className='mt-2 text-sm leading-relaxed text-gray-300'>{description}</p>
        </div>

        <Link href='/dashboard/billing'>
          <Button
            className='!border-violet-400/40 !bg-violet-500/15 !text-violet-100 hover:!border-violet-300/55 hover:!bg-violet-500/20'
            type='default'
          >
            {ctaLabel}
          </Button>
        </Link>
      </div>

      <div className='mt-4 grid gap-2 md:grid-cols-3'>
        {bullets.map((bullet) => (
          <div
            key={bullet}
            className='rounded-xl border border-white/6 bg-black/20 px-3 py-3 text-sm text-gray-300'
          >
            {bullet}
          </div>
        ))}
      </div>
    </div>
  )
}

interface OBSOverlayProps {
  onProgressChange?: (progress: SetupStepProgressState) => void
}

export default function OBSOverlay({ onProgressChange }: OBSOverlayProps) {
  const user = useSession()?.data?.user
  const track = useTrack()
  const copyURL = useBaseUrl(`overlay/${user ? user.id : ''}`)
  const { hasAccess: hasAutoOBSAccess } = useFeatureAccess('autoOBS')

  const [activeKey, setActiveKey] = useState<OverlayType>('auto')
  const [autoObsProgress, setAutoObsProgress] = useState<SetupStepProgressState | null>(null)
  const router = useRouter()
  const isManualMode = activeKey !== 'auto'
  const manualVariant = activeKey === 'video' ? 'video' : 'text'

  const updateUrlWithOverlayType = (newOverlayType: 'auto' | 'text' | 'video') => {
    // Update the URL without adding a new history entry
    router.replace(
      {
        pathname: router.pathname,
        query: { ...router.query, overlayType: newOverlayType },
      },
      undefined,
      { shallow: true },
    ) // `shallow: true` to not trigger data fetching methods again
  }

  useEffect(() => {
    const parsedStep = router.query.overlayType as string
    if (parsedStep === 'auto' || parsedStep === 'text' || parsedStep === 'video') {
      setActiveKey(parsedStep)
    }
  }, [router.query.overlayType])

  useEffect(() => {
    if (isManualMode) {
      onProgressChange?.({
        label: manualVariant === 'video' ? 'Manual video walkthrough' : 'Manual overlay setup',
        detail:
          manualVariant === 'video'
            ? 'Follow the video guide to add your browser source in OBS manually.'
            : 'Use the manual OBS steps to add your browser source and fit it to screen.',
        completedCount: 1,
        totalCount: 2,
        isComplete: false,
        needsAttention: false,
      })
      return
    }

    if (!hasAutoOBSAccess) {
      onProgressChange?.({
        label: 'Automatic OBS setup is part of Pro',
        detail:
          'Upgrade if you want Dotabod to add the browser source for you, or switch to Manual setup and add it yourself.',
        completedCount: 0,
        totalCount: 2,
        isComplete: false,
        needsAttention: false,
      })
      return
    }

    onProgressChange?.(
      autoObsProgress ?? {
        label: 'Ready for OBS connection',
        detail: 'Connect OBS and choose the scene where Dota 2 is captured.',
        completedCount: 0,
        totalCount: 2,
        isComplete: false,
        needsAttention: false,
      },
    )
  }, [activeKey, autoObsProgress, hasAutoOBSAccess, isManualMode, manualVariant, onProgressChange])

  const handleAutomaticMode = () => {
    setActiveKey('auto')
    updateUrlWithOverlayType('auto')
    track('overlay/change_tab', { tab: 'auto' })
  }

  const handleManualMode = () => {
    const nextManualMode = activeKey === 'video' ? 'video' : 'text'
    setActiveKey(nextManualMode)
    updateUrlWithOverlayType(nextManualMode)
    track('overlay/change_tab', { tab: nextManualMode })
  }

  const CopyInstructions = () => (
    <div className='flex flex-col items-center gap-4 md:flex-row'>
      <CopyButton value={copyURL}>
        {({ copied, copy }) => (
          <Button
            type='dashed'
            className={clsx(copied && 'border-green-600! text-green-600!')}
            onClick={() => {
              copy()
              track('overlay/copy_url')
            }}
          >
            {copied ? 'Copied to clipboard!' : 'Copy your browser source URL'}
          </Button>
        )}
      </CopyButton>
      <div className='mt-4 gap-2 text-xs md:mt-0'>
        <Tag color='red'>Warning</Tag>
        <span>Do not share or show this URL on stream</span>
      </div>
    </div>
  )

  const OBSVideo = () => (
    <div className='space-y-2'>
      <div className='flex items-center gap-2'>
        <Tag className='text-xs!'>Note</Tag>
        <span>OBS and Streamlabs have the same instructions</span>
      </div>
      <p>Paste this into the URL field when making the browser source</p>
      <div className='flex flex-col items-center space-y-4'>
        <video
          className='rounded-lg'
          playsInline
          width='630'
          height='766'
          controls
          autoPlay
          muted
          loop
        >
          <source src='/images/setup/how-to-obs.mp4' type='video/mp4' />
          Your browser does not support the video tag.
        </video>
      </div>
    </div>
  )

  const OBSText = () => (
    <div className='space-y-2'>
      <div className='flex items-center gap-2'>
        <Tag className='text-xs!'>Note</Tag>
        <span>OBS and Streamlabs have the same instructions</span>
      </div>

      <p>
        1. Let&apos;s see what our canvas resolution is set to. Open OBS Studio and go to File &gt;
        Settings
      </p>
      <div className='flex flex-col items-center space-y-4'>
        <Image
          alt='dotabod browser source properties'
          width={331}
          unoptimized
          height={292}
          src='/images/setup/obs-step-1.png'
        />
      </div>

      <p>
        2. Remember your &quot;Base (Canvas) Resolution&quot;. It&apos;s usually 1920x1080 but you
        could have a different one.
      </p>
      <div className='flex flex-col items-center space-y-4'>
        <Image
          alt='dotabod browser source properties'
          width={544}
          unoptimized
          height={310}
          src='/images/setup/obs-step-2.png'
        />
      </div>

      <p>
        3. Close the settings window. Now let&apos;s add the browser source. Under Sources click Add
        &gt; Browser and press OK.
      </p>

      <div className='flex flex-col items-center space-y-4'>
        <Image
          alt='dotabod browser source properties'
          width={572}
          unoptimized
          height={256}
          src='/images/setup/obs-step-3.png'
        />
      </div>

      <p>
        4. Fill out the properties, entering your &quot;Base (Canvas) Resolution&quot; from Step 2
        earlier. If you had 1920x1080, put 1920 for width, and 1080 for height.
      </p>
      <div className='ml-4 space-y-4'>
        <p>
          Copy and paste your personal URL from the panel above into the URL field (1) for the
          browser source. Click OK to save.
        </p>

        <div className='mt-4'>
          <RegionalBlockingNote />
        </div>
      </div>

      <div className='flex flex-col items-center space-y-4'>
        <Image
          alt='dotabod browser source properties'
          unoptimized
          width={635}
          height={519}
          src='/images/setup/obs-step-4.png'
        />
      </div>
      <p>5. Right click the Dotabod browser source &gt; Transform &gt; Fit to screen.</p>
    </div>
  )

  return (
    <Card className='!p-0 overflow-hidden'>
      <SetupStepHeader
        step={3}
        title='Set up your stream overlay'
        subtitle='Dotabod shows your medal, prediction polls, hero blockers, and more — live on stream. Some commands like !hero require the overlay.'
      />
      <div className='space-y-5 px-6 py-6 text-sm text-gray-300'>
        <SetupStepPanel
          eyebrow='Your browser source'
          title='Keep your personal overlay URL handy'
          description='Every overlay is tied to your account. Copy this URL into OBS manually, or keep it nearby while Dotabod connects to OBS for you.'
          status={<SetupStatusPill tone='info'>Overlay URL ready</SetupStatusPill>}
        >
          <CopyInstructions />
        </SetupStepPanel>

        <SetupStepPanel
          eyebrow='OBS setup'
          title='Choose how you want to add the overlay'
          description='Automatic setup is the faster premium path. Manual setup is always available if you want to paste the browser source into OBS yourself.'
          status={
            <SetupStatusPill
              tone={isManualMode ? 'neutral' : hasAutoOBSAccess ? 'info' : 'neutral'}
            >
              {isManualMode
                ? manualVariant === 'video'
                  ? 'Manual video walkthrough'
                  : 'Manual overlay setup'
                : hasAutoOBSAccess
                  ? 'Automatic setup included'
                  : 'Automatic setup is part of Pro'}
            </SetupStatusPill>
          }
        >
          <SetupModeSelector
            automaticBadge={<PremiumChip included={hasAutoOBSAccess} />}
            automaticDescription='Connect OBS, choose your scene, and let Dotabod create and lock the browser source for you.'
            manualDescription='Copy your overlay URL, paste it into OBS yourself, and follow either the written steps or the video walkthrough.'
            onAutomaticSelect={handleAutomaticMode}
            onManualSelect={handleManualMode}
            value={activeKey}
          />

          {activeKey === 'auto' ? (
            hasAutoOBSAccess ? (
              <ObsSetup onProgressChange={setAutoObsProgress} />
            ) : (
              <PremiumAutomationCard
                bullets={[
                  'Dotabod adds the browser source for you',
                  'Scene selection and setup happen in one flow',
                  'Less fiddling inside OBS before you go live',
                ]}
                ctaLabel='See Pro plans'
                description='Upgrade if you want Dotabod to connect to OBS and place the overlay automatically. If you want to stay on Free, Manual setup is ready below and still gets you on stream quickly.'
              />
            )
          ) : (
            <div className='space-y-4'>
              <div className='rounded-xl border border-dashed border-gray-700 bg-gray-900/60 p-4 text-sm text-gray-400'>
                You&apos;re viewing the manual overlay path right now. Paste your browser source URL
                into OBS yourself, or switch back if you want Dotabod to handle setup automatically.
              </div>

              <div className='flex flex-wrap gap-2'>
                <Button
                  type={manualVariant === 'text' ? 'primary' : 'default'}
                  onClick={() => {
                    setActiveKey('text')
                    updateUrlWithOverlayType('text')
                    track('overlay/change_tab', { tab: 'text' })
                  }}
                >
                  Manual steps
                </Button>
                <Button
                  type={manualVariant === 'video' ? 'primary' : 'default'}
                  onClick={() => {
                    setActiveKey('video')
                    updateUrlWithOverlayType('video')
                    track('overlay/change_tab', { tab: 'video' })
                  }}
                >
                  Video walkthrough
                </Button>
                <Button onClick={handleAutomaticMode}>Switch to automatic OBS setup</Button>
              </div>

              {manualVariant === 'video' ? <OBSVideo /> : <OBSText />}
            </div>
          )}
        </SetupStepPanel>
      </div>
      <div className='border-t border-gray-800 px-6 py-4'>
        <p className='flex items-center gap-1.5 text-xs text-gray-500'>
          <QuestionCircleOutlined />
          <span>
            Having trouble?{' '}
            <Link
              target='_blank'
              href='/dashboard/help'
              className='text-gray-400 hover:text-gray-200'
            >
              Get help
            </Link>{' '}
            or try{' '}
            <Link
              onClick={() => {
                track('overlay/manual_steps')
              }}
              href='/dashboard?step=3&overlayType=text'
              className='text-gray-400 hover:text-gray-200'
            >
              the manual steps
            </Link>
            .
          </span>
        </p>
      </div>
    </Card>
  )
}
