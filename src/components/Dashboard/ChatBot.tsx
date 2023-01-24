import { Card } from '@/ui/card'
import { Snippet } from '@geist-ui/core'
import { List, ThemeIcon } from '@mantine/core'
import clsx from 'clsx'
import { X } from 'lucide-react'
import { useSession } from 'next-auth/react'
import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import TwitchFetcher from 'twitch-fetcher'
import { Badge } from '@mantine/core'

const emotesRequired = [
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
          1. Add @dotabod as a moderator to your channel. Type the following in
          your stream.
        </div>

        <Snippet symbol="" text="/mod dotabod" width="750px" />

        <div>
          2. <Badge>Optional</Badge> Add the following emotes to your channel
          using BTTV (case sensitive):
        </div>
        <List size="sm" className="ml-8 grid grid-cols-3 lg:grid-cols-4">
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
                <List.Item
                  icon={
                    !thisEmote && (
                      <ThemeIcon color={thisEmote ? 'green' : 'blue'} size={22}>
                        <X size={15} />
                      </ThemeIcon>
                    )
                  }
                  key={label}
                >
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
                        ' transition-colors hover:text-[#E6E8F1]',
                        thisEmote
                          ? 'text-dark-300 line-through'
                          : 'text-blue-400'
                      )}
                      target="_blank"
                      href={
                        url ??
                        `https://betterttv.com/emotes/shared/search?query=${label}`
                      }
                    >
                      {label}
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
