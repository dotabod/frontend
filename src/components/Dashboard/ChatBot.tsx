import { Card } from '@/ui/card'
import { ActionIcon, CheckIcon, Input, List, Tooltip } from '@mantine/core'
import clsx from 'clsx'
import { useSession } from 'next-auth/react'
import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import TwitchFetcher from 'twitch-fetcher'
import { Badge } from '@mantine/core'
import { ClipboardIcon } from '@heroicons/react/24/outline'
import ModImage from '@/components/ModImage'
import { useClipboard } from '@mantine/hooks'
import { ExternalLinkIcon } from 'lucide-react'

const emotesRequired = [
  {
    label: 'HECANT',
    url: 'https://7tv.app/emotes/62978b4c441e9cea5e91f9e7',
  },
  {
    label: 'SuskaygeAgreeGe',
    url: 'https://7tv.app/emotes/61ae3975e9684edbbc395461',
  },
  {
    label: 'Happi',
    url: 'https://7tv.app/emotes/63e2f6ff5d4acdefd447be20',
  },
  { label: 'Madge', url: 'https://7tv.app/emotes/60a95f109d598ea72fad13bd' },
  { label: 'POGGIES', url: 'https://7tv.app/emotes/60af1b5a35c50a77926314ad' },
  {
    label: 'PepeLaugh',
    url: 'https://7tv.app/emotes/60420e3f77137b000de9e675',
  },
  { label: 'ICANT', url: 'https://7tv.app/emotes/61e2d59077175547b4254999' },
  { label: 'BASED', url: 'https://7tv.app/emotes/6043181d1d4963000d9dae39' },
  { label: 'Chatting', url: 'https://7tv.app/emotes/60ef410f48cde2fcc3eb5caa' },
  {
    label: 'massivePIDAS',
    url: 'https://7tv.app/emotes/6257e7a3131d4588262a7505',
  },
  { label: 'Sadge', url: 'https://7tv.app/emotes/61630205c1ff9a17cc396522' },
  { label: 'EZ', url: 'https://7tv.app/emotes/63071b80942ffb69e13d700f' },
  { label: 'Clap', url: 'https://7tv.app/emotes/60aed217c9cf495e5be86812' },
  {
    label: 'peepoGamble',
    url: 'https://7tv.app/emotes/60d83a6277324757d60ae099',
  },
  {
    label: 'PauseChamp',
    url: 'https://7tv.app/emotes/60b012a8e5a579561100b67f',
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
      <div className="title command">
        <h3>Step one. Twitch chat bot</h3>
      </div>
      <div className="subtitle">
        Allows the Dotabod chat bot to type in your chat in case you ever turn
        on follower or subscribe mode.
      </div>
      <div className="space-y-4 px-8 pb-8 text-sm text-dark-300">
        <div>
          1. Type the following in your stream to add @dotabod as a moderator to{' '}
          <Link
            className="text-blue-400 hover:text-blue-300"
            target="_blank"
            href={`https://www.twitch.tv/popout/${session.data.user.name}/chat`}
          >
            your channel
          </Link>
          .
        </div>
        <Input
          icon={<ModImage />}
          readOnly
          styles={(theme) => ({
            input: {
              focusRing: 'never',
              borderColor: clipboard.copied ? theme.colors.green[9] : '',
            },
          })}
          className={clsx('max-w-sm transition-colors')}
          value="/mod dotabod"
          onClick={() => clipboard.copy('/mod dotabod')}
          rightSection={
            <Tooltip
              opened={clipboard.copied}
              label={clipboard.copied ? 'Copied' : 'Copy'}
              withArrow
              position="right"
            >
              <ActionIcon
                color={clipboard.copied ? 'teal' : 'gray'}
                onClick={() => clipboard.copy('/mod dotabod')}
              >
                {clipboard.copied ? (
                  <CheckIcon width={16} />
                ) : (
                  <ClipboardIcon width={16} />
                )}
              </ActionIcon>
            </Tooltip>
          }
        />

        <div>
          2. <Badge>Optional</Badge> Add the following emotes to your channel
          using 7TV (case sensitive):
        </div>
        <List
          size="sm"
          className="ml-8 grid grid-cols-1 space-y-1 md:grid-cols-3 md:space-y-0 lg:grid-cols-4"
        >
          {emotesRequired
            .sort((a, b) => {
              // if its found in emotes, put it at the bottom
              if (emotes.find((e) => e.code === a.label)) return 1
              if (emotes.find((e) => e.code === b.label)) return -1
              return 0
            })
            .map(({ label, url }) => {
              const thisEmote = emotes.find((e) => e.code === label)
              return (
                <List.Item key={label}>
                  <div
                    className={clsx(
                      'flex items-center space-x-2',
                      thisEmote && 'opacity-50'
                    )}
                  >
                    {thisEmote && (
                      <Image
                        height={22}
                        width={22}
                        src={thisEmote.cdn.low}
                        alt={thisEmote.code}
                      />
                    )}
                    <Link
                      className={clsx(
                        'flex items-center space-x-1',
                        ' transition-colors hover:text-[#E6E8F1]',
                        thisEmote
                          ? 'text-dark-300 line-through'
                          : 'text-blue-400'
                      )}
                      target="_blank"
                      href={
                        url ||
                        `https://betterttv.com/emotes/shared/search?query=${label}`
                      }
                    >
                      <span>{label}</span>
                      <ExternalLinkIcon size={14} />
                    </Link>
                  </div>
                </List.Item>
              )
            })}
        </List>
      </div>
    </Card>
  )
}
