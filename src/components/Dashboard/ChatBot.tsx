import { Card } from '@/ui/card'
import clsx from 'clsx'
import { useSession } from 'next-auth/react'
import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import TwitchFetcher from 'twitch-fetcher'
import { CheckIcon, ClipboardIcon } from '@heroicons/react/24/outline'
import ModImage from '@/components/ModImage'
import { useClipboard } from '@mantine/hooks'
import { ExternalLinkIcon, XIcon } from 'lucide-react'
import { Tooltip, Input, List, Button, Badge } from 'antd'
import MmrForm from './Features/MmrForm'

const SevenTVBaseURL = (id: string) => `https://7tv.app/emotes/${id}`
const SevenTVBaseEmoteURL = (id: string) =>
  `https://cdn.7tv.app/emote/${id}/2x.webp`
const BttvBaseURL = (id: string) => `https://betterttv.com/emotes/${id}`
const BttvBaseEmoteURL = (id: string) =>
  `https://cdn.betterttv.net/emote/${id}/2x.webp`

const emotesRequired = [
  {
    label: 'HECANT',
    id: '62978b4c441e9cea5e91f9e7',
  },
  {
    label: 'Okayeg',
    id: '603caa69faf3a00014dff0b1',
  },
  {
    label: 'Happi',
    bttv: true,
    id: '634042bce6cf26500b42ce56',
  },
  { label: 'Madge', id: '60a95f109d598ea72fad13bd' },
  { label: 'POGGIES', id: '60af1b5a35c50a77926314ad' },
  {
    label: 'PepeLaugh',
    id: '60420e3f77137b000de9e675',
  },
  { label: 'ICANT', id: '61e2d59077175547b4254999' },
  { label: 'BASED', id: '6043181d1d4963000d9dae39' },
  { label: 'Chatting', id: '60ef410f48cde2fcc3eb5caa' },
  {
    label: 'massivePIDAS',
    id: '6257e7a3131d4588262a7505',
  },
  { label: 'Sadge', id: '61630205c1ff9a17cc396522' },
  { label: 'EZ', id: '63071b80942ffb69e13d700f' },
  { label: 'Clap', id: '60aed217c9cf495e5be86812' },
  {
    label: 'peepoGamble',
    id: '60d83a6277324757d60ae099',
  },
  {
    label: 'PauseChamp',
    id: '60b012a8e5a579561100b67f',
  },
]

export default function ChatBot() {
  const session = useSession()
  const [emotes, setEmotes] = useState([])
  const clipboard = useClipboard({ timeout: 2000 })

  useEffect(() => {
    if (!session.data.user.twitchId) return

    const emoteFetcher = new TwitchFetcher()
    emoteFetcher
      .getEmotesByID(session.data.user.twitchId, {
        ffz: true,
        '7tv': true,
        bttv: true,
      })
      .then(setEmotes)
      .catch((e) => {
        //
      })
  }, [session.data.user.twitchId])

  return (
    <Card>
      <div className="mb-4 space-x-2">
        <span>
          <b>Why?</b> The chat bot needs to be able to type in your chat in case
          you ever turn on follower or subscriber only mode.
        </span>
        <Image
          className="inline"
          alt="ok emote"
          unoptimized
          src="https://cdn.7tv.app/emote/6268904f4f54759b7184fa72/1x.webp"
          width={28}
          height={28}
        />
      </div>
      <div>
        <ol className="ml-4 list-decimal space-y-4">
          <li>
            Type the following in{' '}
            <Tooltip title="Open your chat in a new window">
              <a
                onClick={() => {
                  window.open(
                    `https://www.twitch.tv/popout/${session.data.user.name}/chat`,
                    'mywindow',
                    'menubar=1,resizable=1,width=350,height=250'
                  )
                }}
              >
                your stream
              </a>
            </Tooltip>{' '}
            to add @dotabod as a moderator.
          </li>
          <Input
            addonBefore={<ModImage />}
            readOnly
            color={clipboard.copied ? 'green' : ''}
            className={clsx('max-w-sm transition-colors')}
            value="/mod dotabod"
            onClick={() => clipboard.copy('/mod dotabod')}
            addonAfter={
              <Tooltip
                color={clipboard.copied ? 'green' : ''}
                title={clipboard.copied ? 'Copied' : 'Copy'}
              >
                <Button
                  type="ghost"
                  size="small"
                  block
                  icon={
                    clipboard.copied ? (
                      <CheckIcon width={16} />
                    ) : (
                      <ClipboardIcon width={16} />
                    )
                  }
                  onClick={() => clipboard.copy('/mod dotabod')}
                />
              </Tooltip>
            }
          />
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
              if (emotes.find((e) => e.code === a.label)) return 1
              if (emotes.find((e) => e.code === b.label)) return -1
              return 0
            })}
            renderItem={({ bttv, id, label }) => {
              const added = emotes.find((e) => e.code === label)

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
