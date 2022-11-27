import { Card } from '@/ui/card'
import { Snippet } from '@geist-ui/core'
import Link from 'next/link'

const emotes = [
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
  return (
    <Card>
      <Card.Header>
        <Card.Title>1. Twitch bot</Card.Title>
        <Card.Description>
          Allows the Dotabod chat bot to type in your chat in case you have
          followers mode or subscribers mode ever turned on.
        </Card.Description>
      </Card.Header>
      <Card.Content>
        <div className="space-y-2">
          <div>
            i. Add @dotabod as a moderator to your channel. Type the following
            in your stream.
          </div>

          <Snippet symbol="" text="/mod dotabod" width="750px" />

          <div>
            ii. Add the following emotes to your channel using BTTV (case
            sensitive):
          </div>
          <ul className="ml-8 list-disc">
            {emotes.map(({ label, url }) => (
              <li key={label}>
                <Link
                  className="text-blue-500 hover:text-blue-300"
                  target="_blank"
                  href={
                    url ??
                    `https://betterttv.com/emotes/shared/search?query=${label}`
                  }
                >
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </Card.Content>
    </Card>
  )
}
