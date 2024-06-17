import { Card } from '@/ui/card'
import { CheckIcon } from '@heroicons/react/24/outline'
import { useClipboard } from '@mantine/hooks'
import { Badge, List, Tooltip } from 'antd'
import clsx from 'clsx'
import { ExternalLinkIcon, XIcon } from 'lucide-react'
import { useSession } from 'next-auth/react'
import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import MmrForm from './Features/MmrForm'

const SevenTVBaseURL = (id) => `https://7tv.app/emotes/${id}`
const SevenTVBaseEmoteURL = (id) => `https://cdn.7tv.app/emote/${id}/2x.webp`
const BttvBaseURL = (id) => `https://betterttv.com/emotes/${id}`
const BttvBaseEmoteURL = (id) => `https://cdn.betterttv.net/emote/${id}/2x.webp`

const emotesRequired = [
  { label: 'HECANT', id: '62978b4c441e9cea5e91f9e7' },
  { label: 'Okayeg', id: '603caa69faf3a00014dff0b1' },
  { label: 'Happi', bttv: true, id: '634042bce6cf26500b42ce56' },
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

const fetchSevenTVTwitchUser = async (broadcaster_id) => {
  try {
    const url = `https://7tv.io/v3/users/twitch/${broadcaster_id}`
    const response = await fetch(url, { method: 'GET' })
    return await response.json()
  } catch (error) {
    console.error(error)
  }
  return null
}

let ws = null

const connectWebSocket = async (broadcaster_id, setEmotes) => {
  if (ws !== null) {
    return
  }

  ws = new WebSocket(SOCKET_URL)

  ws.onopen = async () => {
    const id = await fetchSevenTVTwitchUser(broadcaster_id)
    const subscribe = {
      op: 35,
      d: {
        type: 'emote_set.update',
        condition: { object_id: id.emote_set.id },
      },
    }
    ws.send(JSON.stringify(subscribe))
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
  const clipboard = useClipboard({ timeout: 2000 })

  useEffect(() => {
    if (!session.data.user.twitchId) return
    ;(async () => {
      const user = await fetchSevenTVTwitchUser(session.data.user.twitchId)
      if (Array.isArray(user?.emote_set?.emotes)) {
        setEmotes(user.emote_set.emotes)
      }
      if (user?.emote_set?.id) {
        connectWebSocket(session.data.user.twitchId, setEmotes)
      }
    })()
  }, [session.data.user.twitchId])

  return (
    <Card>
      <div>
        <ol className="ml-4 list-decimal space-y-4">
          <li>
            Dotabod doesn&apos;t know your MMR right now, so let&apos;s tell it{' '}
            <span className="text-xs text-gray-500">
              (you can change it later)
            </span>
          </li>

          <MmrForm hideText={true} />

          <li>
            Dotabod uses these emotes in chat, so add them to your channel:
          </li>
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
            renderItem={({ bttv, id, label }) => {
              const added = emotes.find((e) => e.name === label)

              return (
                <List.Item key={label}>
                  <div className={clsx('flex items-center space-x-2')}>
                    <Tooltip title={label}>
                      <Link
                        className={clsx('group flex items-center space-x-1')}
                        target="_blank"
                        href={bttv ? BttvBaseURL(id) : SevenTVBaseURL(id)}
                      >
                        <Badge
                          offset={[10, 10]}
                          count={
                            added ? (
                              <CheckIcon className="h-4 w-4 text-green-600" />
                            ) : (
                              <XIcon className="h-4 w-4 text-red-600" />
                            )
                          }
                        >
                          <Image
                            className={clsx(
                              !added && 'grayscale group-hover:grayscale-0',
                              'rounded border border-transparent p-2 transition-all group-hover:border group-hover:border-solid group-hover:border-purple-300'
                            )}
                            height={50}
                            width={50}
                            src={
                              bttv
                                ? BttvBaseEmoteURL(id)
                                : SevenTVBaseEmoteURL(id)
                            }
                            alt={id}
                          />
                        </Badge>
                        <ExternalLinkIcon size={14} />
                      </Link>
                    </Tooltip>
                  </div>
                </List.Item>
              )
            }}
          />
        </ol>
      </div>
    </Card>
  )
}
