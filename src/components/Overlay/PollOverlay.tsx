import TwitchFetcher from 'twitch-fetcher'
import { motionProps } from '@/ui/utils'
import { Center, Progress } from '@mantine/core'
import { motion, useMotionValue, useSpring } from 'framer-motion'
import Countdown, { zeroPad } from 'react-countdown'
import { useTransformRes } from '@/lib/hooks/useTransformRes'
import { useEffect, useRef, useState } from 'react'
import { useGetSettings } from '@/lib/hooks/useUpdateSetting'
import { TextWithEmotes } from './TextWithEmotes'

function AnimatedNumber({ from, to }) {
  const ref = useRef(null)
  const motionValue = useMotionValue(from)
  const springValue = useSpring(motionValue)

  useEffect(() => {
    motionValue.set(to)
  }, [motionValue, to])

  useEffect(
    () =>
      springValue.onChange((latest) => {
        if (ref.current) {
          ref.current.textContent = latest.toFixed(0)
        }
      }),
    [springValue],
  )

  return <span ref={ref} />
}

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
        ffz: true,
        '7tv': true,
        bttv: true,
      })
      .then(setEmotes)
      .catch((e) => {
        //
      })
  }, [data?.Account?.providerAccountId])

  const totalVotes = choices.reduce((acc, choice) => acc + choice.totalVotes, 0)
  const choicesWithPercent = choices.map((choice) => {
    const percent = !totalVotes
      ? Math.round(100 / choices.length)
      : Math.round((choice.totalVotes / totalVotes) * 100)
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
      <Progress
        size={res({ w: 24 })}
        className="border border-slate-600 shadow-lg"
        radius="lg"
        sections={choicesWithPercent.map((choice, i) => ({
          label: `${choice.title}${
            choice.totalVotes
              ? ` ${choice.percent}% (${choice.totalVotes.toLocaleString()})`
              : ''
          }`,
          value: choice.percent,
          color: PollColors[i] || PollColors[0],
        }))}
      />
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
