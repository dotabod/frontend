import { Card } from '@/ui/card'
import { Snippet } from '@geist-ui/core'
import { useSession } from 'next-auth/react'
import Link from 'next/link'

const emotes = [
  'Chatting',
  'massivePIDAS',
  'Sadge',
  'EZ',
  'Clap',
  'peepoGamble',
  'PauseChamp',
]

export default function ChatBot() {
  const user = useSession()?.data?.user

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

          <div>ii. Add the following emotes using BTTV (case sensitive):</div>
          <ul className="ml-8 list-disc">
            {emotes.map((emote) => (
              <li key={emote}>
                <Link
                  className="text-blue-500 hover:text-blue-300"
                  target="_blank"
                  href={`https://betterttv.com/emotes/shared/search?query=${emote}`}
                >
                  {emote}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </Card.Content>
    </Card>
  )
}
