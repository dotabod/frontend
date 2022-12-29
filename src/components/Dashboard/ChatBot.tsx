import { Card } from '@/ui/card'
import { Collapse, Snippet } from '@geist-ui/core'
import { List } from '@mantine/core'
import clsx from 'clsx'
import { useSession } from 'next-auth/react'
import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import TwitchFetcher from 'twitch-fetcher'

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
  console.log(emotes)

  return (
    <Card>
      <Collapse
        initialVisible
        className="border-dark-700"
        shadow
        title="Step one. Chat bot"
        subtitle="Allows the Dotabod chat bot to type in your chat in case you ever turn on follower or subscribe mode."
      >
        <div className="space-y-2 text-sm text-dark-300">
          <div>
            1. Add @dotabod as a moderator to your channel. Type the following
            in your stream.
          </div>

          <Snippet symbol="" text="/mod dotabod" width="750px" />

          <div>
            2. Add the following emotes to your channel using BTTV (case
            sensitive):
          </div>
          <List size="xs" className="ml-8 list-disc">
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
                    <div className="flex items-center space-x-2 space-y-2">
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
      </Collapse>
    </Card>
  )
}
