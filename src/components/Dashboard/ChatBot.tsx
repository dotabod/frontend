import { Settings } from '@/lib/defaultSettings'
import { fetcher } from '@/lib/fetcher'
import { useUpdateAccount, useUpdateSetting } from '@/lib/hooks/useUpdateSetting'
import { useTrack } from '@/lib/track'
import { StepComponent } from '@/pages/dashboard/troubleshoot'
import { Card } from '@/ui/card'
import { Alert, Button, Divider, List, Spin, Tooltip, Tabs } from 'antd'
import clsx from 'clsx'
import { ExternalLinkIcon } from 'lucide-react'
import { useSession } from 'next-auth/react'
import Image from 'next/image'
import { useEffect, useState } from 'react'
import useSWR from 'swr'
import MmrForm from './Features/MmrForm'
import { TierBadge } from '@/components/Dashboard/Features/TierBadge'
import { useFeatureAccess } from '@/hooks/useSubscription'
import { useRouter } from 'next/router'

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
  { label: 'EZ', id: '01GB9W6V0000098BZVD7GKTW0F' },
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

export default function ChatBot() {
  const { data: accountData } = useUpdateAccount()
  const session = useSession()
  const [emotes, setEmotes] = useState<Emote[]>([])
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const stvUrl = `https://7tv.io/v3/users/twitch/${session?.data?.user?.twitchId}`
  const track = useTrack()
  const { hasAccess: hasAutoModeratorAccess } = useFeatureAccess('autoModerator')
  const { error: makeDotabodModError, isLoading: makeDotabodModLoading } = useSWR(
    hasAutoModeratorAccess ? '/api/make-dotabod-mod' : null,
    fetcher,
    {
      revalidateIfStale: false,
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    },
  )
  const { hasAccess: hasAuto7TVAccess } = useFeatureAccess('auto7TV')
  const { error: updateEmoteSetError } = useSWR(
    hasAuto7TVAccess ? '/api/update-emote-set' : null,
    (url) => {
      track('updateEmoteSet called')
      return fetcher(url)
    },
    {
      revalidateIfStale: false,
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    },
  )
  const [activeKey7TV, setActiveKey7TV] = useState('auto')
  const [activeKeyMod, setActiveKeyMod] = useState('auto')
  const router = useRouter()

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
        setLoading(false)
      }
    }

    // On load
    fetchUserData()

    // Every 5 seconds
    const intervalId = setInterval(fetchUserData, 5000)

    return () => clearInterval(intervalId)
  }, [stvUrl, updateEmoteSetError])

  const { data: mmr, loading: loadingMmr } = useUpdateSetting(Settings.mmr)

  const stepOneComplete =
    accountData?.accounts?.length > 0
      ? accountData?.accounts?.filter((a) => a.mmr > 0).length > 0
      : !!mmr
  const stepModComplete = !makeDotabodModLoading && !makeDotabodModError

  const stepTwoComplete = user?.id
  const stepThreeComplete = hasAuto7TVAccess ? user?.hasDotabodEditor : true
  const stepFourComplete = user?.hasDotabodEmoteSet
  const initialStep = [stepTwoComplete, stepThreeComplete, stepFourComplete].filter(Boolean).length

  return (
    <Card>
      <h1>Twitch</h1>
      <StepComponent
        hideTitle={true}
        status={stepOneComplete ? 'finish' : undefined}
        steps={[
          <span className='flex flex-col space-y-4' key={1}>
            {!stepOneComplete ? (
              <>
                <div>
                  <span>Dotabod doesn&apos;t know your MMR right now, so let&apos;s tell it</span>
                  <span className='text-xs text-gray-500'> (you can change it later)</span>
                </div>
                <MmrForm hideText={true} />
              </>
            ) : (
              <div>
                <span>Dotabod knows your MMR!</span>
              </div>
            )}
          </span>,
        ]}
      />
      <div className='space-y-4 pb-8 text-sm text-gray-300'>
        <Tabs
          defaultActiveKey={activeKeyMod}
          activeKey={activeKeyMod}
          destroyInactiveTabPane
          onTabClick={(key) => {
            track('chatbot/change_mod_tab', { tab: key })
          }}
          onChange={updateUrlWithModType}
          items={[
            {
              label: (
                <span>
                  Automatic (Mod) <TierBadge feature='autoModerator' />
                </span>
              ),
              key: 'auto',
              children: (
                <div className='flex flex-row items-center space-x-2'>
                  {makeDotabodModLoading && <Spin size='small' spinning={loading} />}
                  {makeDotabodModError ? (
                    <div>
                      Dotabod needs to be a moderator in your Twitch channel to function properly.
                    </div>
                  ) : (
                    <div>Dotabod is a moderator in your Twitch channel.</div>
                  )}
                </div>
              ),
            },
            {
              label: 'Manual (Mod)',
              key: 'manual',
              children: (
                <div>
                  <p>To manually add Dotabod as a moderator:</p>
                  <ol className='list-decimal pl-4'>
                    <li>Go to your Twitch chat</li>
                    <li>Type the command: /mod dotabod</li>
                  </ol>
                </div>
              ),
            },
          ]}
        />
      </div>
      <Divider />
      <div className='flex items-center gap-2'>
        <h1>7TV</h1>
      </div>
      <div className='space-y-4 pb-8 text-sm text-gray-300'>
        <Tabs
          defaultActiveKey={activeKey7TV}
          activeKey={activeKey7TV}
          destroyInactiveTabPane
          onTabClick={(key) => {
            track('chatbot/change_7tv_tab', { tab: key })
          }}
          onChange={updateUrlWith7TVType}
          items={[
            {
              label: (
                <span>
                  Automatic (7TV) <TierBadge feature='auto7TV' />
                </span>
              ),
              key: 'auto',
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
                    <div key={1} className='flex flex-col space-y-2'>
                      <div className='flex flex-row items-center space-x-2'>
                        {loading && <Spin size='small' spinning={loading} />}
                        {!user ? (
                          <>
                            <div>
                              You don't have a 7TV account setup yet! Dotabod uses 7TV to display
                              emotes in your chat.{' '}
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
                          <div>You have a 7TV account connected to Twitch.</div>
                        )}
                      </div>
                    </div>,

                    <div key={2}>
                      <div className='flex flex-row items-center space-x-2'>
                        {hasAuto7TVAccess ? (
                          !user?.hasDotabodEditor ? (
                            <div>
                              <div>
                                <span>You must add Dotabod as an editor </span>
                                <Button
                                  className='!pl-0'
                                  target='_blank'
                                  type='link'
                                  href={`https://7tv.app/users/${user?.id}`}
                                  icon={<ExternalLinkIcon size={14} />}
                                  iconPosition='end'
                                  onClick={() => {
                                    track('7TV Add Editor')
                                  }}
                                >
                                  on your 7TV account
                                </Button>
                              </div>

                              <div className='flex flex-row items-center space-x-3'>
                                {loading && <Spin size='small' spinning={true} />}
                                <span>Waiting for Dotabod to become an editor...</span>
                              </div>
                            </div>
                          ) : (
                            <div>Dotabod is an editor on your 7TV account.</div>
                          )
                        ) : (
                          <div>
                            <p>
                              You can add the required emotes manually to your emote set. Click each
                              emote below to add it to your set.
                            </p>
                          </div>
                        )}
                      </div>
                    </div>,
                    <div key={3}>
                      <div className='flex flex-row items-center space-x-2 mb-4'>
                        <div className='flex flex-col'>
                          {updateEmoteSetError ? (
                            <div className='m-4'>
                              <Alert
                                message='There was an error adding the emotes to your 7TV account. Check back again later, or add the emotes manually.'
                                type='error'
                                showIcon
                              />
                            </div>
                          ) : (
                            <>
                              {!user?.hasDotabodEmoteSet ? (
                                <div className='flex flex-row space-x-4'>
                                  {hasAuto7TVAccess ? (
                                    <>
                                      <Spin size='small' spinning={true} />
                                      <p>
                                        Dotabod will automatically add the following emotes after
                                        the previous steps are completed.
                                      </p>
                                    </>
                                  ) : (
                                    <p>Click each emote below to add it to your emote set:</p>
                                  )}
                                </div>
                              ) : (
                                <div>The following emotes are ready to use!</div>
                              )}
                            </>
                          )}
                        </div>
                      </div>

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
                          const added =
                            user?.hasDotabodEmoteSet || emotes.find((e) => e?.name === label)

                          return (
                            <List.Item key={label}>
                              <div className={clsx('flex items-center space-x-1')}>
                                <Tooltip title={label}>
                                  <a
                                    href={`https://7tv.app/emotes/${id}`}
                                    target='_blank'
                                    rel='noreferrer'
                                  >
                                    <Image
                                      className={clsx(
                                        !added && 'grayscale group-hover:grayscale-0',
                                        'rounded border border-transparent p-2 transition-all group-hover:border group-hover:border-solid group-hover:border-purple-300',
                                      )}
                                      height={60}
                                      width={60}
                                      src={SevenTVBaseEmoteURL(id)}
                                      alt={id}
                                    />
                                  </a>
                                </Tooltip>
                              </div>
                            </List.Item>
                          )
                        }}
                      />
                    </div>,
                  ]}
                />
              ),
            },
            {
              label: 'Manual (7TV)',
              key: 'manual',
              children: (
                <div>
                  <p>To manually add the required emotes:</p>
                  <ol className='list-decimal pl-4'>
                    <li>Make sure you have a 7TV account and it's connected to your Twitch</li>
                    <li>Click each emote below to open it on 7TV</li>
                    <li>Click the "Add to My Emotes" button for each emote</li>
                  </ol>

                  <List
                    grid={{
                      xs: 3,
                      sm: 4,
                      md: 5,
                      lg: 6,
                      xl: 8,
                      xxl: 10,
                    }}
                    dataSource={emotesRequired}
                    renderItem={({ id, label }) => (
                      <List.Item key={label}>
                        <div className={clsx('flex items-center space-x-1')}>
                          <Tooltip title={label}>
                            <a
                              href={`https://7tv.app/emotes/${id}`}
                              target='_blank'
                              rel='noreferrer'
                            >
                              <Image
                                className={clsx(
                                  !emotes.find((e) => e?.name === label) &&
                                    'grayscale group-hover:grayscale-0',
                                  'rounded border border-transparent p-2 transition-all group-hover:border group-hover:border-solid group-hover:border-purple-300',
                                )}
                                height={60}
                                width={60}
                                src={SevenTVBaseEmoteURL(id)}
                                alt={id}
                              />
                            </a>
                          </Tooltip>
                        </div>
                      </List.Item>
                    )}
                  />
                </div>
              ),
            },
          ]}
        />
      </div>
    </Card>
  )
}
