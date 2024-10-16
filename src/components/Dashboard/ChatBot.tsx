import { Settings } from '@/lib/defaultSettings'
import { fetcher } from '@/lib/fetcher'
import {
  useUpdateAccount,
  useUpdateSetting,
} from '@/lib/hooks/useUpdateSetting'
import { useTrack } from '@/lib/track'
import { StepComponent } from '@/pages/dashboard/troubleshoot'
import { Card } from '@/ui/card'
import { captureException } from '@sentry/nextjs'
import { Button, Divider, List, Spin, Tooltip } from 'antd'
import clsx from 'clsx'
import { ExternalLinkIcon } from 'lucide-react'
import { useSession } from 'next-auth/react'
import Image from 'next/image'
import { useEffect, useState } from 'react'
import useSWR from 'swr'
import MmrForm from './Features/MmrForm'

const SevenTVBaseEmoteURL = (id) => `https://cdn.7tv.app/emote/${id}/2x.webp`

export const emotesRequired = [
  { label: 'HECANT', id: '62978b4c441e9cea5e91f9e7' },
  { label: 'Okayeg', id: '603caa69faf3a00014dff0b1' },
  { label: 'Happi', id: '645defc42769a28df1a4487f' },
  { label: 'Madge', id: '60a95f109d598ea72fad13bd' },
  { label: 'POGGIES', id: '60af1b5a35c50a77926314ad' },
  { label: 'PepeLaugh', id: '60420e3f77137b000de9e675' },
  { label: 'ICANT', id: '61e2d59077175547b4254999' },
  { label: 'BASED', id: '6043181d1d4963000d9dae39' },
  { label: 'Chatting', id: '60ef410f48cde2fcc3eb5caa' },
  { label: 'massivePIDAS', id: '6257e7a3131d4588262a7505' },
  { label: 'Sadge', id: '61630205c1ff9a17cc396522' },
  { label: 'EZ', id: '63071b80942ffb69e13d700f' },
  { label: 'Clap', id: '60aed217c9cf495e5be86812' },
  { label: 'peepoGamble', id: '60d83a6277324757d60ae099' },
  { label: 'PauseChamp', id: '60b012a8e5a579561100b67f' },
]

export default function ChatBot() {
  const { data: accountData, loading: loadingAccounts } = useUpdateAccount()
  const session = useSession()
  const [emotes, setEmotes] = useState([])
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const stvUrl = `https://7tv.io/v3/users/twitch/${session?.data?.user?.twitchId}`
  const track = useTrack()
  const { error: makeDotabodModError, isLoading: makeDotabodModLoading } =
    useSWR('/api/make-dotabod-mod', fetcher)

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
                editor.id === '63d688c3a897cb667b7e601b'
            ),
          hasDotabodEmoteSet: !!emotesRequired.every(
            (emote) =>
              Array.isArray(data.emote_set?.emotes) &&
              data.emote_set?.emotes?.find(
                (e: { name: string }) => e.name === emote.label
              )
          ),
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
  }, [stvUrl])

  useEffect(() => {
    if (!user?.hasDotabodEmoteSet && user?.hasDotabodEditor) {
      fetch('/api/update-emote-set')
        .then(() => {
          setUser((prev) => ({ ...prev, hasDotabodEmoteSet: true }))
        })
        .catch((e) => {
          console.error(e)
          captureException(e)
        })
    }
  }, [user?.hasDotabodEmoteSet, user?.hasDotabodEditor])

  const { data: mmr, loading: loadingMmr } = useUpdateSetting(Settings.mmr)

  const stepOneComplete =
    accountData?.accounts?.length > 0
      ? accountData?.accounts?.filter((a) => a.mmr > 0).length > 0
      : !!mmr
  const stepModComplete = !makeDotabodModLoading && !makeDotabodModError

  const stepTwoComplete = user?.id
  const stepThreeComplete = user?.hasDotabodEditor
  const stepFourComplete = user?.hasDotabodEmoteSet
  const initialStep = [
    stepTwoComplete,
    stepThreeComplete,
    stepFourComplete,
  ].filter(Boolean).length

  if (loading || loadingAccounts) {
    return (
      <Card>
        <Spin size="large" />
      </Card>
    )
  }

  return (
    <Card>
      <h1>Twitch</h1>
      <StepComponent
        hideTitle={true}
        status={stepOneComplete ? 'finish' : undefined}
        steps={[
          <span className="flex flex-col space-y-4" key={1}>
            {!stepOneComplete ? (
              <>
                <div>
                  <span>
                    Dotabod doesn&apos;t know your MMR right now, so let&apos;s
                    tell it
                  </span>
                  <span className="text-xs text-gray-500">
                    {' '}
                    (you can change it later)
                  </span>
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
      <StepComponent
        hideTitle={true}
        status={stepModComplete ? 'finish' : undefined}
        steps={[
          // Check if dotabod is a moderator of the channel
          <div key={2} className="flex flex-col space-y-2">
            <div className="flex flex-row items-center space-x-2">
              {makeDotabodModLoading && (
                <Spin size="small" spinning={loading} />
              )}
              {makeDotabodModError ? (
                <div>
                  Dotabod needs to be a moderator in your Twitch channel to
                  function properly.
                </div>
              ) : (
                <div>Dotabod is a moderator in your Twitch channel.</div>
              )}
            </div>
          </div>,
        ]}
      />
      <Divider />
      <h1>7TV</h1>
      <StepComponent
        initialStep={initialStep}
        stepProps={[
          { status: stepTwoComplete ? 'finish' : undefined },
          { status: stepThreeComplete ? 'finish' : undefined },
          { status: stepFourComplete ? 'finish' : undefined },
        ]}
        steps={[
          <div key={1} className="flex flex-col space-y-2">
            <div className="flex flex-row items-center space-x-2">
              {loading && <Spin size="small" spinning={loading} />}
              {!user ? (
                <>
                  <div>
                    You don't have a 7TV account setup yet! Dotabod uses 7TV to
                    display emotes in your chat.{' '}
                  </div>
                  <div>
                    <Button
                      target="_blank"
                      type="primary"
                      href="https://7tv.app/"
                      icon={<ExternalLinkIcon size={14} />}
                      iconPosition="end"
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
            <div className="flex flex-row items-center space-x-2">
              {!user?.hasDotabodEditor ? (
                <div>
                  <div>
                    <span>You must add Dotabod as an editor </span>
                    <Button
                      className="!pl-0"
                      target="_blank"
                      type="link"
                      href={`https://7tv.app/users/${user?.id}`}
                      icon={<ExternalLinkIcon size={14} />}
                      iconPosition="end"
                      onClick={() => {
                        track('7TV Add Editor')
                      }}
                    >
                      on your 7TV account
                    </Button>
                  </div>

                  <div className="flex flex-row items-center space-x-3">
                    {loading && <Spin size="small" spinning={true} />}
                    <span>Waiting for Dotabod to become an editor...</span>
                  </div>
                </div>
              ) : (
                <div>Dotabod is an editor on your 7TV account.</div>
              )}
            </div>
          </div>,
          <div key={3}>
            <div className="flex flex-row items-center space-x-2 mb-4">
              {!user?.hasDotabodEmoteSet && (
                <Spin size="small" spinning={!user?.hasDotabodEmoteSet} />
              )}
              {!user?.hasDotabodEditor || !user?.hasDotabodEmoteSet ? (
                <div>
                  Dotabod will be able to use the following emotes after the
                  previous steps are completed.
                </div>
              ) : (
                <div>The following emotes are ready to use!</div>
              )}
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
                  user?.hasDotabodEmoteSet ||
                  emotes.find((e) => e?.name === label)

                return (
                  <List.Item key={label}>
                    <div className={clsx('flex items-center space-x-1')}>
                      <Tooltip title={label}>
                        <Image
                          className={clsx(
                            !added && 'grayscale group-hover:grayscale-0',
                            'rounded border border-transparent p-2 transition-all group-hover:border group-hover:border-solid group-hover:border-purple-300'
                          )}
                          height={60}
                          width={60}
                          src={SevenTVBaseEmoteURL(id)}
                          alt={id}
                        />
                      </Tooltip>
                    </div>
                  </List.Item>
                )
              }}
            />
          </div>,
        ]}
      />
    </Card>
  )
}
