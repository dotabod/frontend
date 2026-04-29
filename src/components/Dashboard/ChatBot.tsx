import { Alert, Button, List, Spin, Tooltip } from 'antd'
import clsx from 'clsx'
import { CrownIcon, ExternalLinkIcon, SparklesIcon } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { useSession } from 'next-auth/react'
import { useEffect, useState } from 'react'
import useSWR from 'swr'
import { useFeatureAccess } from '@/hooks/useSubscription'
import { Settings } from '@/lib/defaultSettings'
import { fetcher } from '@/lib/fetcher'
import {
  STABLE_SWR_OPTIONS,
  useUpdateAccount,
  useUpdateSetting,
} from '@/lib/hooks/useUpdateSetting'
import { useTrack } from '@/lib/track'
import { StepComponent } from '@/pages/dashboard/help'
import { Card } from '@/ui/card'
import MmrForm from './Features/MmrForm'
import type { SetupStepProgressState } from './SetupProgressShell'
import { SetupStatusPill, SetupStepHeader, SetupStepPanel } from './SetupStepHeader'

const SevenTVBaseEmoteURL = (id) => `https://cdn.7tv.app/emote/${id}/2x.webp`

export const emotesRequired = [
  { label: 'HECANT', id: '01G4FZG870000487MWX9F93YF7' },
  { label: 'Okayeg', id: '01EZPFKAH8000FNWX000ADZW5H' },
  { label: 'Happi', id: '01H07F15D00002ETD2HQRT8J3Z' },
  { label: 'Madge', id: '01F6ASPNM00009TPCEMWQTT4XX' },
  { label: 'POGGIES', id: '01F6P05NWG0003BH8AEY96655D' },
  { label: 'PepeLaugh', id: '01F010F9GR0007E4VV006YKSKN' },
  { label: 'ICANT', id: '01FSF14EM00007E5TN8YT2AJCS' },
  { label: 'BASED', id: '01F031CCA80001TJB3006SVBHS' },
  { label: 'Chatting', id: '01FAK9C8MR0004HKF2ZK1YPQ5A' },
  { label: 'massivePIDAS', id: '01G0KP1N5R000167A5H0K2MX85' },
  { label: 'Sadge', id: '01FHNBZRW8000C3ZWT2Z63JS92' },
  { label: 'EZ', id: '01F9FS6EEG0006XXD6DX0K9Y04' },
  { label: 'Clap', id: '01F6NE9AER000CKKT9BSDYGT0J' },
  { label: 'peepoGamble', id: '01F96A83PG0007ECJ7AZB0NR4S' },
  { label: 'PauseChamp', id: '01F6QWHR20000EB9BSAR8G1DKZ' },
]

// Add type at the top
type User = {
  id?: string
  personalSet?: string
  hasDotabodEditor: boolean
  hasDotabodEmoteSet: boolean
}

type Emote = {
  name: string
  id: string
}

type SetupMode = 'auto' | 'manual'

const EmoteList = ({ emotes, user }: { emotes: Emote[]; user: User | null }) => (
  <List
    grid={{
      xs: 3,
      sm: 4,
      md: 5,
      lg: 6,
      xl: 8,
      xxl: 10,
    }}
    dataSource={emotesRequired.sort((a, b) => {
      // if it's found in emotes, put it at the bottom
      if (emotes.find((e) => e?.name === a.label)) return 1
      if (emotes.find((e) => e?.name === b.label)) return -1
      return 0
    })}
    renderItem={({ id, label }) => {
      const added = user?.hasDotabodEmoteSet || emotes.find((e) => e?.name === label)

      return (
        <List.Item key={label}>
          <div className={clsx('flex items-center gap-1')}>
            <Tooltip title={label}>
              <Link href={`https://7tv.app/emotes/${id}`} target='_blank' rel='noreferrer'>
                <Image
                  className={clsx(
                    !added && 'grayscale group-hover:grayscale-0',
                    'rounded-sm border border-transparent p-2 transition-all group-hover:border group-hover:border-solid group-hover:border-purple-300',
                  )}
                  height={60}
                  width={60}
                  src={SevenTVBaseEmoteURL(id)}
                  alt={id}
                />
              </Link>
            </Tooltip>
          </div>
        </List.Item>
      )
    }}
  />
)

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
  onModeChange,
  value,
}: {
  automaticBadge?: React.ReactNode
  automaticDescription: string
  manualDescription: string
  onModeChange: (mode: SetupMode) => void
  value: SetupMode
}) {
  return (
    <div className='mb-5 rounded-2xl border border-gray-800/80 bg-black/20 p-2'>
      <div className='grid gap-2 lg:grid-cols-2'>
        <SetupModeButton
          badge={automaticBadge}
          description={automaticDescription}
          isActive={value === 'auto'}
          onClick={() => onModeChange('auto')}
          title='Automatic setup'
        />
        <SetupModeButton
          description={manualDescription}
          isActive={value === 'manual'}
          onClick={() => onModeChange('manual')}
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
            onClick={() => undefined}
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

interface ChatBotProps {
  onProgressChange?: (progress: SetupStepProgressState) => void
}

export default function ChatBot({ onProgressChange }: ChatBotProps) {
  const { data: accountData } = useUpdateAccount()
  const session = useSession()
  const [emotes, setEmotes] = useState<Emote[]>([])
  const [user, setUser] = useState<User | null>(null)
  const [isSevenTvLoading, setIsSevenTvLoading] = useState(true)
  const [activeKey7TV, setActiveKey7TV] = useState('auto')
  const [activeKeyMod, setActiveKeyMod] = useState('auto')
  const stvUrl = `https://7tv.io/v3/users/twitch/${session?.data?.user?.twitchId}`
  const track = useTrack()
  const { hasAccess: hasAutoModeratorAccess } = useFeatureAccess('autoModerator')
  const {
    data: moderatorAutomationResult,
    error: makeDotabodModError,
    isLoading: makeDotabodModLoading,
  } = useSWR(
    session?.data?.user?.id ? '/api/make-dotabod-mod' : null,
    async (url: string) => {
      const response = await fetch(url)
      const payload = await response.json().catch(() => null)

      if (response.status === 403) {
        return {
          status: 'FORBIDDEN',
          ...(payload || {}),
        }
      }

      if (!response.ok) {
        const error = new Error('An error occurred while fetching the data.') as Error & {
          info?: unknown
          status?: number
        }
        error.info = payload
        error.status = response.status
        throw error
      }

      return payload
    },
    {
      ...STABLE_SWR_OPTIONS,
      refreshInterval: (latestData) => (latestData?.status === 'OK' ? 0 : 5000),
      shouldRetryOnError(error) {
        return error.status !== 403
      },
    },
  )
  const { hasAccess: hasAuto7TVAccess } = useFeatureAccess('auto7TV')
  const { error: updateEmoteSetError } = useSWR(
    hasAuto7TVAccess && activeKey7TV === 'auto' && user?.id ? '/api/update-emote-set' : null,
    (url) => {
      track('updateEmoteSet called')
      return fetcher(url)
    },
    STABLE_SWR_OPTIONS,
  )
  const router = useRouter()

  const isModeratorConfirmed = moderatorAutomationResult?.status === 'OK'
  const isModeratorAutoLocked =
    activeKeyMod === 'auto' && !hasAutoModeratorAccess && !isModeratorConfirmed
  const isEmoteAutoLocked = activeKey7TV === 'auto' && !hasAuto7TVAccess
  const isEmoteManualMode = activeKey7TV === 'manual' || !hasAuto7TVAccess
  const requiresEditorAccess = activeKey7TV === 'auto' && hasAuto7TVAccess

  const handleModModeChange = (mode: SetupMode) => {
    setActiveKeyMod(mode)
    updateUrlWithModType(mode)
    track('chatbot/change_mod_tab', { tab: mode })
  }

  const handle7TVModeChange = (mode: SetupMode) => {
    setActiveKey7TV(mode)
    updateUrlWith7TVType(mode)
    track('chatbot/change_7tv_tab', { tab: mode })
  }

  useEffect(() => {
    const parsedMod = router.query.modType as string
    const parsed7TV = router.query.sevenTvType as string

    if (parsedMod === 'auto' || parsedMod === 'manual') {
      setActiveKeyMod(parsedMod)
    }
    if (parsed7TV === 'auto' || parsed7TV === 'manual') {
      setActiveKey7TV(parsed7TV)
    }
  }, [router.query.modType, router.query.sevenTvType])

  const updateUrlWithModType = (newType: 'auto' | 'manual') => {
    router.replace(
      {
        pathname: router.pathname,
        query: { ...router.query, modType: newType },
      },
      undefined,
      { shallow: true },
    )
  }

  const updateUrlWith7TVType = (newType: 'auto' | 'manual') => {
    router.replace(
      {
        pathname: router.pathname,
        query: { ...router.query, sevenTvType: newType },
      },
      undefined,
      { shallow: true },
    )
  }

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const response = await fetch(`${stvUrl}?cacheBust=${Date.now()}`)
        const data = await response.json()
        const user = {
          id: data?.user?.id,
          personalSet: data?.emote_set?.id,
          hasDotabodEditor:
            Array.isArray(data.user?.editors) &&
            !!data.user?.editors?.find(
              (editor: { id: string }) =>
                editor.id?.toLowerCase() === '01GQZ0CEDR000AH5YBCSXQWR0V'.toLowerCase(),
            ),
          hasDotabodEmoteSet: !!emotesRequired.every(
            (emote) =>
              Array.isArray(data.emote_set?.emotes) &&
              data.emote_set?.emotes?.find((e: { name: string }) => e.name === emote.label),
          ),
        }

        if (updateEmoteSetError) {
          setUser((prev) => (prev ? { ...prev, hasDotabodEmoteSet: false } : null))
          clearInterval(intervalId)
        }

        if (user?.id) {
          setUser(user)
          if (user.hasDotabodEditor && user.hasDotabodEmoteSet) {
            clearInterval(intervalId)
          }
          if (Array.isArray(data?.emote_set?.emotes)) {
            setEmotes(data.emote_set.emotes)
          }
        }
      } catch (error) {
        console.error('Error fetching user data:', error)
      } finally {
        setIsSevenTvLoading(false)
      }
    }

    // On load
    fetchUserData()

    // Every 5 seconds
    const intervalId = setInterval(fetchUserData, 5000)

    return () => clearInterval(intervalId)
  }, [stvUrl, updateEmoteSetError])

  useEffect(() => {
    if (updateEmoteSetError && activeKey7TV === 'auto') {
      setActiveKey7TV('manual')
      updateUrlWith7TVType('manual')
      track('chatbot/auto_7tv_fallback_to_manual')
    }
  }, [activeKey7TV, track, updateEmoteSetError])

  useEffect(() => {
    if (makeDotabodModError && activeKeyMod === 'auto') {
      setActiveKeyMod('manual')
      updateUrlWithModType('manual')
      track('chatbot/auto_mod_fallback_to_manual')
    }
  }, [activeKeyMod, makeDotabodModError, track])

  const { data: mmr } = useUpdateSetting(Settings.mmr)

  const stepOneComplete =
    accountData?.accounts?.length > 0
      ? accountData?.accounts?.filter((a) => a.mmr > 0).length > 0
      : !!mmr
  const stepModComplete = isModeratorConfirmed
  const stepTwoComplete = user?.id
  const stepThreeComplete = user?.hasDotabodEditor
  const stepFourComplete = user?.hasDotabodEmoteSet
  const initialStep =
    activeKey7TV === 'manual'
      ? [stepTwoComplete, stepFourComplete].filter(Boolean).length
      : [stepTwoComplete, stepThreeComplete, stepFourComplete].filter(Boolean).length
  const modStatusTone = stepModComplete
    ? 'success'
    : !stepOneComplete
      ? 'warning'
      : isModeratorAutoLocked
        ? 'neutral'
        : 'info'
  const modStatusLabel = stepModComplete
    ? 'Chat ready'
    : !stepOneComplete
      ? 'Needs your MMR first'
      : isModeratorAutoLocked
        ? 'Automatic setup available on Pro'
        : activeKeyMod === 'manual'
          ? 'Finish the Twitch mod step'
          : makeDotabodModLoading
            ? 'Automatic setup in progress'
            : 'Waiting for moderator access'
  const sevenTvStatusTone = stepFourComplete
    ? 'success'
    : !stepTwoComplete
      ? 'warning'
      : isEmoteAutoLocked
        ? 'neutral'
        : updateEmoteSetError
          ? 'warning'
          : 'info'
  const sevenTvStatusLabel = stepFourComplete
    ? 'Emotes ready'
    : !stepTwoComplete
      ? '7TV account needed'
      : isEmoteAutoLocked
        ? 'Automatic setup available on Pro'
        : requiresEditorAccess && !stepThreeComplete
          ? 'Waiting for editor access'
          : updateEmoteSetError
            ? 'Manual fallback ready'
            : activeKey7TV === 'manual'
              ? 'Add the emotes manually'
              : 'Automatic add in progress'

  useEffect(() => {
    const progressChecks = [
      stepOneComplete,
      stepModComplete,
      stepTwoComplete,
      ...(requiresEditorAccess ? [stepThreeComplete] : []),
      stepFourComplete,
    ]
    const completedCount = progressChecks.filter(Boolean).length
    const totalCount = progressChecks.length

    const progress: SetupStepProgressState =
      stepFourComplete && stepModComplete
        ? {
            label: 'Chat + emotes ready',
            detail: 'Dotabod can respond in chat and all required emotes are installed.',
            completedCount,
            totalCount,
            isComplete: true,
            needsAttention: false,
          }
        : updateEmoteSetError
          ? {
              label: '7TV needs attention',
              detail:
                'Automatic emote install hit an issue, so manual setup is ready as a fallback.',
              completedCount,
              totalCount,
              isComplete: false,
              needsAttention: true,
            }
          : !stepOneComplete
            ? {
                label: 'MMR still needed',
                detail: 'Add your MMR first so Dotabod can finish chat setup cleanly.',
                completedCount,
                totalCount,
                isComplete: false,
                needsAttention: true,
              }
            : !stepModComplete
              ? {
                  label:
                    activeKeyMod === 'auto' && !hasAutoModeratorAccess
                      ? 'Automatic chat setup is part of Pro'
                      : activeKeyMod === 'manual'
                        ? 'Finish the mod step in Twitch chat'
                        : 'Waiting for mod access',
                  detail:
                    activeKeyMod === 'auto' && !hasAutoModeratorAccess
                      ? 'Upgrade to let Dotabod request moderator access for you, or switch to Manual setup to finish it in chat.'
                      : activeKeyMod === 'manual'
                        ? 'Open Twitch chat and run /mod dotabod. We will confirm it here automatically.'
                        : 'Dotabod is checking moderator access in your Twitch chat.',
                  completedCount,
                  totalCount,
                  isComplete: false,
                  needsAttention: false,
                }
              : !stepTwoComplete
                ? {
                    label: 'Connect your 7TV account',
                    detail: '7TV is the last major dependency before emote setup can finish.',
                    completedCount,
                    totalCount,
                    isComplete: false,
                    needsAttention: false,
                  }
                : requiresEditorAccess && !stepThreeComplete
                  ? {
                      label: 'Waiting for editor access',
                      detail: 'Add Dotabod as a 7TV editor so it can manage your emote set.',
                      completedCount,
                      totalCount,
                      isComplete: false,
                      needsAttention: false,
                    }
                  : !stepFourComplete
                    ? {
                        label:
                          activeKey7TV === 'auto' && !hasAuto7TVAccess
                            ? 'Automatic emote setup is part of Pro'
                            : activeKey7TV === 'manual'
                              ? 'Add the required emotes manually'
                              : 'Adding required emotes',
                        detail:
                          activeKey7TV === 'auto' && !hasAuto7TVAccess
                            ? 'Upgrade if you want Dotabod to manage emotes for you, or switch to Manual setup and add them yourself.'
                            : activeKey7TV === 'manual'
                              ? 'Open each emote below on 7TV and add it to your set.'
                              : 'Dotabod is finishing the 7TV emote setup in the background.',
                        completedCount,
                        totalCount,
                        isComplete: false,
                        needsAttention: false,
                      }
                    : {
                        label: 'Almost ready',
                        detail: 'One last check remains before chat setup is fully complete.',
                        completedCount,
                        totalCount,
                        isComplete: false,
                        needsAttention: false,
                      }

    onProgressChange?.(progress)
  }, [
    activeKey7TV,
    activeKeyMod,
    hasAuto7TVAccess,
    hasAutoModeratorAccess,
    onProgressChange,
    requiresEditorAccess,
    stepOneComplete,
    stepModComplete,
    stepTwoComplete,
    stepThreeComplete,
    stepFourComplete,
    updateEmoteSetError,
  ])

  return (
    <Card className='!p-0 overflow-hidden'>
      <SetupStepHeader
        step={1}
        title='Connecting to Twitch'
        subtitle='Let Dotabod work in your Twitch chat and add the emotes it uses to display game information to your viewers.'
      />
      <div className='space-y-5 px-6 py-6 text-sm text-gray-300'>
        <SetupStepPanel
          eyebrow='Twitch chat'
          title='Make Dotabod work in chat'
          description='Get Dotabod talking in your channel and give it the permissions it needs to respond reliably on stream.'
          status={<SetupStatusPill tone={modStatusTone}>{modStatusLabel}</SetupStatusPill>}
        >
          <div className='mb-4 flex flex-wrap gap-2'>
            <SetupStatusPill tone={stepOneComplete ? 'success' : 'warning'}>
              {stepOneComplete ? 'MMR saved' : 'MMR needed'}
            </SetupStatusPill>
            <SetupStatusPill tone={stepModComplete ? 'success' : 'info'}>
              {stepModComplete
                ? 'Moderator access confirmed'
                : activeKeyMod === 'manual'
                  ? 'Manual path selected'
                  : hasAutoModeratorAccess
                    ? 'Auto-checking moderator access'
                    : 'Automatic path preview'}
            </SetupStatusPill>
            <SetupStatusPill tone={hasAutoModeratorAccess ? 'info' : 'neutral'}>
              {hasAutoModeratorAccess
                ? 'Automatic setup included'
                : 'Automatic setup is part of Pro'}
            </SetupStatusPill>
          </div>

          <SetupModeSelector
            automaticBadge={<PremiumChip included={hasAutoModeratorAccess} />}
            automaticDescription='Dotabod requests moderator access for you and confirms chat is ready without extra Twitch steps.'
            manualDescription='Use one quick Twitch command yourself and keep setup moving without upgrading.'
            onModeChange={handleModModeChange}
            value={activeKeyMod as SetupMode}
          />

          {activeKeyMod === 'auto' ? (
            isModeratorAutoLocked ? (
              <PremiumAutomationCard
                bullets={[
                  'One-click moderator setup from your dashboard',
                  'Automatic confirmation that chat is ready',
                  'Keeps the onboarding flow faster for new channels',
                ]}
                ctaLabel='See Pro plans'
                description='Upgrade if you want Dotabod to request moderator access for you automatically. If you want to stay on Free, Manual setup is right beside it and only takes a quick Twitch command.'
              />
            ) : (
              <StepComponent
                hideTitle={true}
                stepProps={[
                  { status: stepOneComplete ? 'finish' : undefined },
                  {
                    status: stepModComplete ? 'finish' : makeDotabodModError ? 'error' : undefined,
                  },
                ]}
                steps={[
                  <span className='flex flex-col gap-4' key={1}>
                    {!stepOneComplete ? (
                      <>
                        <div>
                          <span>
                            Dotabod doesn&apos;t know your MMR yet, so let&apos;s add it first.
                          </span>
                          <span className='text-xs text-gray-500'> You can change it later.</span>
                        </div>
                        <MmrForm hideText={true} />
                      </>
                    ) : (
                      <div>
                        <span>
                          Dotabod already knows your MMR.{' '}
                          <Link
                            href='/dashboard/features'
                            onClick={() => {
                              track('chatbot/change_mmr')
                            }}
                          >
                            <span className='text-purple-300'>Change it</span>
                          </Link>
                        </span>
                      </div>
                    )}
                  </span>,
                  <span className='flex flex-row items-center gap-2' key={2}>
                    {!stepModComplete ? (
                      makeDotabodModError ? (
                        <Alert
                          message='Automatic moderator setup hit a snag. Manual setup is ready if you want to finish it yourself.'
                          showIcon
                          type='warning'
                        />
                      ) : (
                        <>
                          <Spin size='small' spinning={makeDotabodModLoading} />
                          <div>Dotabod is checking moderator access in your Twitch channel.</div>
                        </>
                      )
                    ) : (
                      <div>Dotabod is already a moderator in your Twitch channel.</div>
                    )}
                  </span>,
                ]}
              />
            )
          ) : (
            <StepComponent
              hideTitle={true}
              stepProps={[
                { status: stepOneComplete ? 'finish' : undefined },
                { status: stepModComplete ? 'finish' : undefined },
                { status: stepModComplete ? 'finish' : undefined },
                { status: stepModComplete ? 'finish' : undefined },
              ]}
              steps={[
                <span className='flex flex-col gap-4' key={1}>
                  {!stepOneComplete ? (
                    <>
                      <div>
                        <span>
                          Dotabod doesn&apos;t know your MMR yet, so let&apos;s add it first.
                        </span>
                        <span className='text-xs text-gray-500'> You can change it later.</span>
                      </div>
                      <MmrForm hideText={true} />
                    </>
                  ) : (
                    <div>
                      <span>
                        Dotabod already knows your MMR.{' '}
                        <Link
                          href='/dashboard/features'
                          onClick={() => {
                            track('chatbot/change_mmr')
                          }}
                        >
                          <span className='text-purple-300'>Change it</span>
                        </Link>
                      </span>
                    </div>
                  )}
                </span>,
                <span key={2}>Open your Twitch chat.</span>,
                <span key={3}>Type the command: /mod dotabod</span>,
                <span key={4}>
                  {!stepModComplete ? (
                    <div className='flex items-center gap-2'>
                      <Spin size='small' spinning={makeDotabodModLoading} />
                      <div>
                        We&apos;ll confirm moderator access here as soon as Twitch reports it.
                      </div>
                    </div>
                  ) : (
                    <div>Moderator access is confirmed.</div>
                  )}
                </span>,
              ]}
            />
          )}
        </SetupStepPanel>

        <SetupStepPanel
          eyebrow='7TV emotes'
          title='Add the emotes Dotabod expects'
          description='These emotes power Dotabod chat responses and make game information feel native to your stream instead of plain text soup.'
          status={<SetupStatusPill tone={sevenTvStatusTone}>{sevenTvStatusLabel}</SetupStatusPill>}
        >
          <div className='mb-4 flex flex-wrap gap-2'>
            <SetupStatusPill tone={stepTwoComplete ? 'success' : 'warning'}>
              {stepTwoComplete ? '7TV account connected' : '7TV account needed'}
            </SetupStatusPill>
            <SetupStatusPill
              tone={requiresEditorAccess ? (stepThreeComplete ? 'success' : 'info') : 'neutral'}
            >
              {requiresEditorAccess
                ? stepThreeComplete
                  ? 'Editor access granted'
                  : 'Waiting for editor access'
                : 'Editor access only needed for automatic setup'}
            </SetupStatusPill>
            <SetupStatusPill
              tone={
                updateEmoteSetError
                  ? 'warning'
                  : stepFourComplete
                    ? 'success'
                    : isEmoteManualMode
                      ? 'neutral'
                      : 'info'
              }
            >
              {updateEmoteSetError
                ? 'Automatic add needs help'
                : stepFourComplete
                  ? 'Required emotes installed'
                  : isEmoteManualMode
                    ? 'Manual setup path'
                    : 'Automatic add in progress'}
            </SetupStatusPill>
            <SetupStatusPill tone={hasAuto7TVAccess ? 'info' : 'neutral'}>
              {hasAuto7TVAccess ? 'Automatic setup included' : 'Automatic setup is part of Pro'}
            </SetupStatusPill>
          </div>

          <SetupModeSelector
            automaticBadge={<PremiumChip included={hasAuto7TVAccess} />}
            automaticDescription='Dotabod manages editor access and adds the required 7TV emotes for you.'
            manualDescription='Add the emotes yourself if you want a fast Free-friendly path with no premium gate.'
            onModeChange={handle7TVModeChange}
            value={activeKey7TV as SetupMode}
          />

          {activeKey7TV === 'auto' ? (
            isEmoteAutoLocked ? (
              <PremiumAutomationCard
                bullets={[
                  'Dotabod manages the 7TV editor flow for you',
                  'Required emotes are installed automatically',
                  'Your emote set stays easier to maintain over time',
                ]}
                ctaLabel='See Pro plans'
                description='Upgrade if you want Dotabod to handle your 7TV setup end-to-end. If you want to stay on Free, switch to Manual setup and add the required emotes yourself.'
              />
            ) : (
              <StepComponent
                initialStep={initialStep}
                stepProps={[
                  { status: stepTwoComplete ? 'finish' : undefined },
                  { status: stepThreeComplete ? 'finish' : undefined },
                  {
                    status: stepFourComplete ? 'finish' : updateEmoteSetError ? 'error' : undefined,
                  },
                ]}
                steps={[
                  <div key={1} className='flex flex-col gap-2'>
                    <div className='flex flex-row items-center gap-2'>
                      {isSevenTvLoading && <Spin size='small' spinning={isSevenTvLoading} />}
                      {!user ? (
                        <>
                          <div>
                            You don&apos;t have a 7TV account connected yet. Dotabod uses 7TV to
                            display the emotes your viewers will see in chat.
                          </div>
                          <div>
                            <Button
                              target='_blank'
                              type='primary'
                              href='https://7tv.app/'
                              icon={<ExternalLinkIcon size={14} />}
                              iconPosition='end'
                              onClick={() => {
                                track('7TV Register')
                              }}
                            >
                              Login to 7TV
                            </Button>
                          </div>
                        </>
                      ) : (
                        <div>Your 7TV account is connected to Twitch.</div>
                      )}
                    </div>
                  </div>,
                  <div key={2}>
                    <div className='flex flex-row items-center gap-2'>
                      {!user?.hasDotabodEditor ? (
                        <div>
                          {user?.hasDotabodEmoteSet ? (
                            <div>
                              <div>
                                You already have the emotes, but Dotabod still needs editor access
                                to keep them updated automatically.
                              </div>
                              <div>
                                <Button
                                  className='pl-0!'
                                  target='_blank'
                                  type='link'
                                  href='https://7tv.app/settings/editors'
                                  icon={<ExternalLinkIcon size={14} />}
                                  iconPosition='end'
                                  onClick={() => {
                                    track('7TV Add Editor')
                                  }}
                                >
                                  Add Dotabod as editor on 7TV
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div>
                              <div>
                                <span>Add Dotabod as an editor </span>
                                <Button
                                  className='pl-0!'
                                  target='_blank'
                                  type='link'
                                  href='https://7tv.app/settings/editors'
                                  icon={<ExternalLinkIcon size={14} />}
                                  iconPosition='end'
                                  onClick={() => {
                                    track('7TV Add Editor')
                                  }}
                                >
                                  on your 7TV account
                                </Button>
                                <span> with permission level: Emote sets → Admin.</span>
                              </div>

                              <div className='mt-2 flex flex-row items-center gap-3'>
                                {isSevenTvLoading && <Spin size='small' spinning={true} />}
                                <span>Waiting for Dotabod to become an editor.</span>
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div>Dotabod is an editor on your 7TV account.</div>
                      )}
                    </div>
                  </div>,
                  <div key={3}>
                    <div className='mb-4 flex flex-row items-center gap-2'>
                      <div className='flex flex-col'>
                        {updateEmoteSetError ? (
                          <Alert
                            message='There was an error adding the emotes automatically. Manual setup is now available so you can finish right away.'
                            type='error'
                            showIcon
                          />
                        ) : !user?.hasDotabodEmoteSet ? (
                          <div className='flex flex-row gap-4'>
                            <Spin size='small' spinning={true} />
                            <p>
                              Dotabod will add the following emotes after the earlier steps are
                              complete.
                            </p>
                          </div>
                        ) : (
                          <div>All required emotes have been added to your channel.</div>
                        )}
                      </div>
                    </div>

                    <EmoteList emotes={emotes} user={user} />
                  </div>,
                ]}
              />
            )
          ) : (
            <div>
              <p className='mb-4 text-sm text-gray-400'>To add the required emotes manually:</p>
              <StepComponent
                hideTitle={true}
                stepProps={[
                  { status: stepTwoComplete ? 'finish' : undefined },
                  { status: undefined },
                  { status: stepFourComplete ? 'finish' : undefined },
                ]}
                steps={[
                  <span key={1}>
                    <div>Make sure you have a 7TV account and it&apos;s connected to Twitch.</div>
                  </span>,
                  <span key={2}>
                    <div>Click each emote below to open it on 7TV.</div>
                  </span>,
                  <span key={3}>
                    <div>Use the “Add to...” button for each emote.</div>
                  </span>,
                ]}
              />

              <div className='mt-5'>
                <EmoteList emotes={emotes} user={user} />
              </div>
            </div>
          )}
        </SetupStepPanel>
      </div>
    </Card>
  )
}
