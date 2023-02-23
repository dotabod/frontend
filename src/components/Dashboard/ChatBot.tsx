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
import { ExternalLinkIcon } from 'lucide-react'
import { Tooltip, Input, List, Button } from 'antd'
import MmrForm from './Features/MMRForm'

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
    url: 'https://betterttv.com/emotes/634042bce6cf26500b42ce56',
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
      <div className="space-y-4 px-8 pb-8 text-sm text-gray-300">
        <div>
          1. Type the following in your stream to add @dotabod as a moderator to{' '}
          <a
            onClick={() => {
              window.open(
                `https://www.twitch.tv/popout/${session.data.user.name}/chat`,
                'mywindow',
                'menubar=1,resizable=1,width=350,height=250'
              )
            }}
          >
            your channel
          </a>
          .
        </div>
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
        <div>
          2. Dotabod doesn&apos;t know your MMR right now, so let&apos;s tell it
          (you can change it later)
        </div>

        <MmrForm hideText={true} />

        <div>
          3. Dotabod uses these emotes in chat, so add them to your channel:
        </div>
        <List
          grid={{
            gutter: 16,
            xs: 1,
            sm: 2,
            md: 4,
            lg: 4,
            xl: 6,
            xxl: 3,
          }}
          dataSource={emotesRequired.sort((a, b) => {
            // if it's found in emotes, put it at the bottom
            if (emotes.find((e) => e.code === a.label)) return 1
            if (emotes.find((e) => e.code === b.label)) return -1
            return 0
          })}
          renderItem={({ label, url }) => {
            const thisEmote = emotes.find((e) => e.code === label)

            return (
              <List.Item key={label}>
                <div
                  className={clsx(
                    'flex items-center space-x-2',
                    thisEmote && 'line-through'
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
                      thisEmote && '!text-gray-300 opacity-80'
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
          }}
        />
      </div>
    </Card>
  )
}
