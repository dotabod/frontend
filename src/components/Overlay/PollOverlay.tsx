import { useTransformRes } from '@/lib/hooks/useTransformRes'
import { useGetSettings } from '@/lib/hooks/useUpdateSetting'
import { motionProps } from '@/ui/utils'
import { Center, Progress } from '@mantine/core'
import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import Countdown, { zeroPad } from 'react-countdown'
import TwitchFetcher from 'twitch-fetcher'
import { TextWithEmotes } from './TextWithEmotes'

export type PollData = {
  title: string
  endDate: number
  choices: { title: string; totalVotes?: number }[]
}

const PollColors = [
  '#3159ff',
  '#ee27a6',
  '#8d8d00',
  '#00b700',
  '#bf0000',
  '#4B0082',
  '#9400D3',
  '#00bb68',
  '#c46300',
  '#c60000',
]
const PollTimer = ({ minutes, seconds, completed }) =>
  completed ? (
    <></>
  ) : (
    <span className="font-outline-2 text-slate-50">
      {zeroPad(minutes)}:{zeroPad(seconds)}
    </span>
  )

export const PollOverlay = ({
  title,
  choices,
  endDate,
  onComplete,
}: PollData & { onComplete: () => void }) => {
  const [emotes, setEmotes] = useState([])
  const { data } = useGetSettings()
  const res = useTransformRes()

  useEffect(() => {
    if (!data?.Account?.providerAccountId) return

    const emoteFetcher = new TwitchFetcher()
    emoteFetcher
      .getEmotesByID(data?.Account?.providerAccountId, {
        '7tv': true,
        bttv: true,
      })
      .then(setEmotes)
      .catch((e) => {
        // Don't need to report on users that don't have a 7tv or bttv account
      })
  }, [data?.Account?.providerAccountId])

  const totalVotes = choices.reduce(
    (acc, choice) => acc + (choice.totalVotes ?? 0),
    0
  )
  const choicesWithPercent = choices.map((choice) => {
    const percent = !totalVotes
      ? Math.round(100 / choices.length)
      : Math.round(((choice.totalVotes ?? 0) / totalVotes) * 100)
    return { ...choice, percent }
  })

  return (
    <motion.div key="poll-overlay-inner" {...motionProps}>
      <h1
        className="font-outline-2 text-center font-bold text-slate-50"
        style={{
          fontSize: res({ h: 20 }),
        }}
      >
        <TextWithEmotes emotes={emotes} text={title} />
      </h1>
      <Progress.Root
        size={res({ w: 24 })}
        className="border border-slate-600 shadow-lg"
        radius="lg"
      >
        {choicesWithPercent.map((choice, i) => (
          <Progress.Section
            key={choice.title}
            value={choice.percent}
            color={PollColors[i] || PollColors[0]}
          >
            <Progress.Label>{`${choice.title}${
              choice.totalVotes
                ? ` ${choice.percent}% (${choice.totalVotes.toLocaleString()})`
                : ''
            }`}</Progress.Label>
          </Progress.Section>
        ))}
      </Progress.Root>
      <Center>
        {endDate && (
          <Countdown
            onComplete={onComplete}
            renderer={PollTimer}
            date={new Date(endDate)}
          />
        )}
      </Center>
    </motion.div>
  )
}
