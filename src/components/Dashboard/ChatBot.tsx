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
    label: 'Happi',
    url: 'https://betterttv.com/emotes/634042bce6cf26500b42ce56',
  },
  { label: 'Madge' },
  { label: 'POGGIES' },
  { label: 'PepeLaugh' },
  { label: 'ICANT' },
  { label: 'BASED' },
  { label: 'Chatting' },
  {
    label: 'massivePIDAS',
    url: 'https://7tv.app/emotes/6257e7a3131d4588262a7505',
  },
  { label: 'Sadge' },
  { label: 'EZ', url: 'https://betterttv.com/emotes/5590b223b344e2c42a9e28e3' },
  { label: 'Clap' },
  { label: 'peepoGamble' },
  { label: 'PauseChamp' },
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
          using BTTV (case sensitive):
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
