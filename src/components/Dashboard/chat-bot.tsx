import { Alert, Button, Divider, List, Spin, Tabs, Tooltip } from 'antd'
import { clsx } from 'clsx'
import { ExternalLinkIcon } from 'lucide-react'
import { useSession } from 'next-auth/react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import useSWR from 'swr'
import { z } from 'zod'

import { TierBadge } from '@/components/Dashboard/Features/tier-badge'
import { useFeatureAccess } from '@/hooks/use-subscription'
import { Settings } from '@/lib/default-settings'
import { fetcher } from '@/lib/fetcher'
import { useSetupModStatus } from '@/lib/hooks/use-setup-mod-status'
import {
  SETTINGS_SWR_OPTIONS,
  useUpdateAccount,
  useUpdateSetting,
} from '@/lib/hooks/use-update-setting'
import { useTrack } from '@/lib/track'
import { StepComponent } from '@/pages/dashboard/help'
import { Card } from '@/ui/card'

import MmrForm from './Features/mmr-form'
import { startSevenTvPolling } from './seven-tv-polling'

const SevenTVBaseEmoteURL = (id: string) => `https://cdn.7tv.app/emote/${id}/2x.webp`

const sevenTvResponseSchema = z.object({
  emote_set: z
    .object({
      emotes: z.array(z.object({ id: z.string(), name: z.string() })).nullish(),
      id: z.string().nullish(),
    })
    .nullish(),
  user: z
    .object({
      editors: z.array(z.object({ id: z.string().nullish() })).nullish(),
      id: z.string().nullish(),
    })
    .nullish(),
})

export const emotesRequired = [
  { id: '01G4FZG870000487MWX9F93YF7', label: 'HECANT' },
  { id: '01EZPFKAH8000FNWX000ADZW5H', label: 'Okayeg' },
  { id: '01H07F15D00002ETD2HQRT8J3Z', label: 'Happi' },
  { id: '01F6ASPNM00009TPCEMWQTT4XX', label: 'Madge' },
  { id: '01F6P05NWG0003BH8AEY96655D', label: 'POGGIES' },
  { id: '01F010F9GR0007E4VV006YKSKN', label: 'PepeLaugh' },
  { id: '01FSF14EM00007E5TN8YT2AJCS', label: 'ICANT' },
  { id: '01F031CCA80001TJB3006SVBHS', label: 'BASED' },
  { id: '01FAK9C8MR0004HKF2ZK1YPQ5A', label: 'Chatting' },
  { id: '01G0KP1N5R000167A5H0K2MX85', label: 'massivePIDAS' },
  { id: '01FHNBZRW8000C3ZWT2Z63JS92', label: 'Sadge' },
  { id: '01F9FS6EEG0006XXD6DX0K9Y04', label: 'EZ' },
  { id: '01F6NE9AER000CKKT9BSDYGT0J', label: 'Clap' },
  { id: '01F96A83PG0007ECJ7AZB0NR4S', label: 'peepoGamble' },
  { id: '01F6QWHR20000EB9BSAR8G1DKZ', label: 'PauseChamp' },
]

// Add type at the top
interface User {
  id?: string
  personalSet?: string
  hasDotabodEditor: boolean
  hasDotabodEmoteSet: boolean
}

interface Emote {
  name: string
  id: string
}

const EMPTY_EMOTES: Emote[] = []

const areEmotesEqual = (current: Emote[], next: Emote[]) =>
  current.length === next.length &&
  current.every((emote, index) => emote.id === next[index]?.id && emote.name === next[index]?.name)

const areUsersEqual = (current: User | null, next: User) => {
  if (current === null) {
    return false
  }

  return [
    current.hasDotabodEditor === next.hasDotabodEditor,
    current.hasDotabodEmoteSet === next.hasDotabodEmoteSet,
    current.id === next.id,
    current.personalSet === next.personalSet,
  ].every(Boolean)
}

const getDisplayedUser = (
  hasTwitchId: boolean,
  updateEmoteSetError: Error | undefined,
  user: User | null,
) => {
  if (!hasTwitchId) {
    return null
  }
  if (updateEmoteSetError !== undefined && user !== null) {
    return { ...user, hasDotabodEmoteSet: false }
  }
  return user
}

const EmoteList: React.FC<{
  emotes: Emote[]
  user: User | null
}> = ({ emotes, user }) => (
  <List
    grid={{
      lg: 6,
      md: 5,
      sm: 4,
      xl: 8,
      xs: 3,
      xxl: 10,
    }}
    dataSource={emotesRequired.toSorted((a, b) => {
      // If it's found in emotes, put it at the bottom
      if (emotes.find((e) => e?.name === a.label)) {
        return 1
      }
      if (emotes.find((e) => e?.name === b.label)) {
        return -1
      }
      return 0
    })}
    renderItem={({ id, label }) => {
      const added = user?.hasDotabodEmoteSet ?? emotes.find((e) => e?.name === label)

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

const ChatBot = () => {
  const { data: accountData } = useUpdateAccount()
  const session = useSession()
  const [polledEmotes, setPolledEmotes] = useState<Emote[]>([])
  const [polledUser, setPolledUser] = useState<User | null>(null)
  const [pollingLoading, setPollingLoading] = useState(true)
  const twitchId = session.data?.user?.twitchId?.trim()
  const hasTwitchId = twitchId !== undefined && twitchId.length > 0
  const track = useTrack()
  const { hasAccess: hasAutoModeratorAccess } = useFeatureAccess('autoModerator')
  // Pro: fire-and-forget the POST that adds dotabod as a moderator. We don't read its
  // Result anymore — current mod state comes from useSetupModStatus below — but the
  // POST still needs to run so the auto-mod action happens for Pro users.
  useSWR(hasAutoModeratorAccess ? '/api/make-dotabod-mod' : null, fetcher, SETTINGS_SWR_OPTIONS)
  const { data: modStatus } = useSetupModStatus()
  const { hasAccess: hasAuto7TVAccess } = useFeatureAccess('auto7TV')
  const updateEmoteSetKey =
    hasAuto7TVAccess && polledUser?.id !== undefined ? '/api/update-emote-set' : null
  const { error: updateEmoteSetError } = useSWR<void, Error>(
    updateEmoteSetKey,
    async (url) => {
      track('updateEmoteSet called')
      return fetcher(url)
    },
    SETTINGS_SWR_OPTIONS,
  )
  const emotes = hasTwitchId ? polledEmotes : EMPTY_EMOTES
  const user = getDisplayedUser(hasTwitchId, updateEmoteSetError, polledUser)
  const loading =
    session.status === 'loading' ||
    (hasTwitchId && updateEmoteSetError === undefined && pollingLoading)
  const [activeKey7TV, setActiveKey7TV] = useState('auto')
  const [activeKeyMod, setActiveKeyMod] = useState('auto')
  const router = useRouter()

  useEffect(() => {
    const parsedMod = router.query.modType
    const parsed7TV = router.query.sevenTvType

    if (parsedMod === 'auto' || parsedMod === 'manual') {
      setActiveKeyMod(parsedMod)
    }
    if (parsed7TV === 'auto' || parsed7TV === 'manual') {
      setActiveKey7TV(parsed7TV)
    }
  }, [router.query.modType, router.query.sevenTvType])

  const updateUrlWithModType = (newType: 'auto' | 'manual') => {
    void router.replace(
      {
        pathname: router.pathname,
        query: { ...router.query, modType: newType },
      },
      undefined,
      { shallow: true },
    )
  }

  const updateUrlWith7TVType = (newType: 'auto' | 'manual') => {
    void router.replace(
      {
        pathname: router.pathname,
        query: { ...router.query, sevenTvType: newType },
      },
      undefined,
      { shallow: true },
    )
  }

  useEffect(() => {
    let active = true
    let stopPolling: (() => void) | undefined

    if (hasTwitchId && updateEmoteSetError === undefined) {
      stopPolling = startSevenTvPolling({
        onError: (error) => {
          if (!active) {
            return
          }
          console.error('Error fetching user data:', error)
          setPollingLoading(false)
        },
        poll: async (signal) => {
          const response = await fetch(
            `https://7tv.io/v3/users/twitch/${encodeURIComponent(twitchId)}?cacheBust=${Date.now()}`,
            { signal },
          )

          if (!response.ok) {
            throw new Error(`Failed to fetch 7TV user: ${response.status} ${response.statusText}`)
          }

          const data = sevenTvResponseSchema.parse(await response.json())
          if (!active) {
            return false
          }
          if (signal.aborted) {
            throw new DOMException('Aborted', 'AbortError')
          }

          const responseEmotes = data.emote_set?.emotes ?? []
          const nextUser = {
            hasDotabodEditor:
              data.user?.editors?.some(
                (editor) => editor.id?.toLowerCase() === '01GQZ0CEDR000AH5YBCSXQWR0V'.toLowerCase(),
              ) ?? false,
            hasDotabodEmoteSet: emotesRequired.every((requiredEmote) =>
              responseEmotes.some((emote) => emote.name === requiredEmote.label),
            ),
            id: data.user?.id ?? undefined,
            personalSet: data.emote_set?.id ?? undefined,
          }

          if (nextUser.id !== undefined) {
            setPolledUser((currentUser) =>
              areUsersEqual(currentUser, nextUser) ? currentUser : nextUser,
            )
            setPolledEmotes((currentEmotes) =>
              areEmotesEqual(currentEmotes, responseEmotes) ? currentEmotes : responseEmotes,
            )
          }

          setPollingLoading(false)
          return !(
            nextUser.id !== undefined &&
            nextUser.hasDotabodEditor &&
            nextUser.hasDotabodEmoteSet
          )
        },
      })
    }

    return () => {
      active = false
      stopPolling?.()
    }
  }, [hasTwitchId, twitchId, updateEmoteSetError])

  const { data: mmr } = useUpdateSetting(Settings.mmr)
  const accountsWithMmr = accountData?.accounts as { mmr: number }[] | undefined

  const accountCount = accountData?.accounts?.length ?? 0
  const stepOneComplete =
    accountCount > 0 ? (accountsWithMmr?.filter((a) => a.mmr > 0).length ?? 0) > 0 : mmr
  const stepModComplete = Boolean(modStatus?.modded)
  const stepTwoComplete = user?.id
  const stepThreeComplete = user?.hasDotabodEditor
  const stepFourComplete = user?.hasDotabodEmoteSet
  const initialStep = [stepTwoComplete, stepThreeComplete, stepFourComplete].filter(Boolean).length

  return (
    <Card>
      <h1 className='text-xl font-bold'>Twitch</h1>
      <div className='gap-4 pb-8 text-sm text-gray-300'>
        <Tabs
          defaultActiveKey={activeKeyMod}
          activeKey={activeKeyMod}
          destroyInactiveTabPane
          onTabClick={(key) => {
            track('chatbot/change_mod_tab', { tab: key })
          }}
          onChange={(key) => {
            if (key === 'auto' || key === 'manual') {
              updateUrlWithModType(key)
            }
          }}
          items={[
            {
              children: (
                <>
                  <StepComponent
                    hideTitle={true}
                    stepProps={[
                      { status: stepOneComplete ? 'finish' : undefined },
                      { status: stepModComplete ? 'finish' : undefined },
                    ]}
                    steps={[
                      <span className='flex flex-col gap-4' key={1}>
                        {stepOneComplete ? (
                          <div>
                            <span>
                              Dotabod knows your MMR.{' '}
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
                        ) : (
                          <>
                            <div>
                              <span>
                                Dotabod doesn&apos;t know your MMR right now, so let&apos;s tell it
                              </span>
                              <span className='text-xs text-gray-500'>
                                {' '}
                                (you can change it later)
                              </span>
                            </div>
                            <MmrForm hideText={true} />
                          </>
                        )}
                      </span>,
                      <span className='flex flex-row items-center gap-2' key={1}>
                        {stepModComplete ? (
                          <div>Dotabod is a moderator in your Twitch channel.</div>
                        ) : (
                          <>
                            <Spin size='small' spinning={loading} />
                            <div>
                              Dotabod needs to be a moderator in your Twitch channel to function
                              properly.
                            </div>
                          </>
                        )}
                      </span>,
                    ]}
                  />
                </>
              ),
              key: 'auto',
              label: (
                <span>
                  Automatic <TierBadge feature='autoModerator' />
                </span>
              ),
            },
            {
              children: (
                <StepComponent
                  stepProps={[
                    { status: stepOneComplete ? 'finish' : undefined },
                    { status: stepModComplete ? 'finish' : undefined },
                    { status: stepModComplete ? 'finish' : undefined },
                    { status: stepModComplete ? 'finish' : undefined },
                  ]}
                  hideTitle={true}
                  steps={[
                    <span className='flex flex-col gap-4' key={1}>
                      {stepOneComplete ? (
                        <div>
                          <span>
                            Dotabod knows your MMR.{' '}
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
                      ) : (
                        <>
                          <div>
                            <span>
                              Dotabod doesn&apos;t know your MMR right now, so let&apos;s tell it
                            </span>
                            <span className='text-xs text-gray-500'>
                              {' '}
                              (you can change it later)
                            </span>
                          </div>
                          <MmrForm hideText={true} />
                        </>
                      )}
                    </span>,
                    <span key={1}>Go to your Twitch chat</span>,
                    <span key={2}>Type the command: /mod dotabod</span>,
                    <span key={3}>
                      {stepModComplete ? (
                        <div>Dotabod is a moderator in your Twitch channel.</div>
                      ) : (
                        <>
                          <Spin size='small' spinning={loading} />
                          <div>
                            Dotabod needs to be a moderator in your Twitch channel to function
                            properly.
                          </div>
                        </>
                      )}
                    </span>,
                  ]}
                />
              ),
              key: 'manual',
              label: 'Manual',
            },
          ]}
        />
      </div>
      <Divider />
      <div className='flex items-center gap-2'>
        <h1 className='text-xl font-bold'>7TV</h1>
      </div>
      <div className='gap-4 pb-8 text-sm text-gray-300'>
        <Tabs
          defaultActiveKey={activeKey7TV}
          activeKey={activeKey7TV}
          destroyInactiveTabPane
          onTabClick={(key) => {
            track('chatbot/change_7tv_tab', { tab: key })
          }}
          onChange={(key) => {
            if (key === 'auto' || key === 'manual') {
              updateUrlWith7TVType(key)
            }
          }}
          items={[
            {
              children: (
                <StepComponent
                  initialStep={initialStep}
                  stepProps={[
                    { status: stepTwoComplete ? 'finish' : undefined },
                    { status: stepThreeComplete ? 'finish' : undefined },
                    {
                      status: stepFourComplete
                        ? 'finish'
                        : updateEmoteSetError
                          ? 'error'
                          : undefined,
                    },
                  ]}
                  steps={[
                    <div key={1} className='flex flex-col gap-2'>
                      <div className='flex flex-row items-center gap-2'>
                        {loading && <Spin size='small' spinning={loading} />}
                        {user ? (
                          <div>You have a 7TV account connected to Twitch.</div>
                        ) : (
                          <>
                            <div>
                              You don&apos;t have a 7TV account setup yet! Dotabod uses 7TV to
                              display emotes in your chat.{' '}
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
                        )}
                      </div>
                    </div>,

                    <div key={2}>
                      <div className='flex flex-row items-center gap-2'>
                        {user?.hasDotabodEditor ? (
                          <div>Dotabod is an editor on your 7TV account.</div>
                        ) : (
                          <div>
                            {user?.hasDotabodEmoteSet ? (
                              <div>
                                <div>
                                  You already have all the required emotes, but you still need to
                                  add Dotabod as an editor to enable auto-updates.
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
                                  <span>You must add Dotabod as an editor </span>
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
                                  <span>with permissions:</span>
                                </div>

                                <div className='flex flex-row items-center gap-3'>
                                  <span>Emote sets: Admin</span>
                                </div>

                                <div className='flex flex-row items-center gap-3'>
                                  {loading && <Spin size='small' spinning={true} />}
                                  <span>Waiting for Dotabod to become an editor...</span>
                                  <span>
                                    Make sure you allow Dotabod to create emote sets on 7TV
                                  </span>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>,
                    <div key={3}>
                      <div className='mb-4 flex flex-row items-center gap-2'>
                        <div className='flex flex-col'>
                          {updateEmoteSetError ? (
                            <div className='m-4'>
                              <Alert
                                message='There was an error adding the emotes to your 7TV account. Check back again later, or add the emotes manually.'
                                type='error'
                                showIcon
                              />
                            </div>
                          ) : user?.hasDotabodEmoteSet ? (
                            <div>All required emotes have been added to your channel!</div>
                          ) : (
                            <div className='flex flex-row gap-4'>
                              <Spin size='small' spinning={true} />
                              <p>
                                Dotabod will automatically add the following emotes after the
                                previous steps are completed.
                              </p>
                            </div>
                          )}
                        </div>
                      </div>

                      <EmoteList emotes={emotes} user={user} />
                    </div>,
                  ]}
                />
              ),
              key: 'auto',
              label: (
                <span>
                  Automatic <TierBadge feature='auto7TV' />
                </span>
              ),
            },
            {
              children: (
                <div>
                  <p>To manually add the required emotes:</p>
                  <StepComponent
                    hideTitle={true}
                    steps={[
                      <span key={1}>
                        <div>
                          Make sure you have a 7TV account and it&apos;s connected to your Twitch
                        </div>
                      </span>,
                      <span key={2}>
                        <div>Click each emote below to open it on 7TV</div>
                      </span>,
                      <span key={3}>
                        <div>Click the &quot;Add to...&quot; button for each emote</div>
                      </span>,
                    ]}
                  />

                  <EmoteList emotes={emotes} user={user} />
                </div>
              ),
              key: 'manual',
              label: 'Manual',
            },
          ]}
        />
      </div>
    </Card>
  )
}

export default ChatBot
