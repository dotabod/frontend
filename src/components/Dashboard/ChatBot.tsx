import { StepComponent } from '@/pages/dashboard/troubleshoot'
import { Card } from '@/ui/card'
import { Button, List, Spin, Tooltip } from 'antd'
import clsx from 'clsx'
import { ExternalLinkIcon } from 'lucide-react'
import { useSession } from 'next-auth/react'
import Image from 'next/image'
import { useEffect, useState } from 'react'
import MmrForm from './Features/MmrForm'

const SevenTVBaseEmoteURL = (id) => `https://cdn.7tv.app/emote/${id}/2x.webp`

const emotesRequired = [
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

const SOCKET_URL = 'wss://events.7tv.io/v3'
let ws = null

const connectWebSocket = async (stvEmoteSetId, setEmotes) => {
  if (ws !== null) {
    return
  }

  ws = new WebSocket(SOCKET_URL)

  ws.onopen = async () => {
    // Subscription for emote_set.update
    const subscribeEmoteSetUpdate = {
      op: 35,
      d: {
        type: 'emote_set.update',
        condition: { object_id: stvEmoteSetId },
      },
    }
    ws.send(JSON.stringify(subscribeEmoteSetUpdate))
  }

  ws.onmessage = (event) => handleMessages(event, setEmotes)
}

const handleMessages = (event, setEmotes) => {
  const data = JSON.parse(event.data)
  if (data.op !== 0) return
  const editor = data.d.body.actor.username || data.d.body.actor.display_name
  let text = null
  if (data.d.body.pushed) {
    const emote = data.d.body.pushed[0].value.name
    text = `emote ${emote} added by ${editor}`
  }
  if (data.d.body.updated) {
    const emote = data.d.body.updated[0].old_value.name
    const alias = data.d.body.updated[0].value.name
    text = `emote ${emote} renamed to ${alias} by ${editor}`
  }
  if (data.d.body.pulled) {
    const emote = data.d.body.pulled[0].old_value.name
    text = `emote ${emote} removed by ${editor}`
  }

  // Update the emote state
  if (data.d.body.pushed) {
    setEmotes((prev) => [
      ...prev,
      ...data.d.body.pushed.map((item) => item.value),
    ])
  }

  if (data.d.body.pulled) {
    setEmotes((prev) =>
      prev.filter(
        (emote) =>
          !data.d.body.pulled.find((r) => r.old_value.name === emote.name)
      )
    )
  }

  if (data.d.body.updated) {
    setEmotes((prev) =>
      prev.map(
        (emote) =>
          data.d.body.updated.find((u) => u.value.name === emote.name) || emote
      )
    )
  }
}

export default function ChatBot() {
  const session = useSession()
  const [emotes, setEmotes] = useState([])
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const stvUrl = `https://7tv.io/v3/users/twitch/${session.data.user.twitchId}`

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const response = await fetch(`${stvUrl}?cacheBust=${Date.now()}`)
        const data = await response.json()
        const user = {
          id: data?.user?.id,
          personalSet: data?.emote_set?.id,
          hasDotabodEditor: !!data.user?.editors?.find(
            (editor) => editor.id === '63d688c3a897cb667b7e601b'
          ),
          hasDotabodEmoteSet: !!data.emote_set?.origins?.find(
            (origin) => origin.id === '6685a8c5a3a3e500d5d42714'
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
          connectWebSocket(data?.emote_set?.id, setEmotes)
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
        })
    }
  }, [user?.hasDotabodEmoteSet, user?.hasDotabodEditor])

  return (
    <Card>
      <StepComponent
        steps={[
          <span className="flex flex-col space-y-4" key={0}>
            <div>
              <span>
                Dotabod doesn&apos;t know your MMR right now, so let&apos;s tell
                it
              </span>
              <span className="text-xs text-gray-500">
                {' '}
                (you can change it later)
              </span>
            </div>
            <MmrForm hideText={true} />
          </span>,
          <div key={1} className="flex flex-col space-y-2">
            <div className="flex flex-row items-center space-x-2">
              <Spin size="small" spinning={loading} />
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
                    >
                      on your 7TV account
                    </Button>
                  </div>

                  <div className="flex flex-row items-center space-x-3">
                    <Spin size="small" spinning={true} />
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
              <Spin size="small" spinning={!user?.hasDotabodEmoteSet} />
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
                if (emotes.find((e) => e.name === a.label)) return 1
                if (emotes.find((e) => e.name === b.label)) return -1
                return 0
              })}
              renderItem={({ id, label }) => {
                const added =
                  user?.hasDotabodEmoteSet ||
                  emotes.find((e) => e.name === label)

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
