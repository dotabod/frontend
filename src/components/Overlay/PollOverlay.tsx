import { motionProps } from '@/ui/utils'
import { Center, Progress } from '@mantine/core'
import { motion } from 'framer-motion'
import Countdown, { zeroPad } from 'react-countdown'
import { useTransformRes } from '@/lib/hooks/useTransformRes'

export type PollData = {
  title: string
  endDate: number
  choices: { title: string; totalVotes?: number }[]
}

const PollColors = [
  '#3159ff',
  '#ee27a6',
  '#FFFF00',
  '#00FF00',
  '#FF0000',
  '#4B0082',
  '#9400D3',
  '#FF0000',
  '#FF7F00',
  '#ff6b6b',
]
const PollTimer = ({ minutes, seconds, completed }) =>
  completed ? (
    <></>
  ) : (
    <span className="font-outline-2 text-slate-50">
      {zeroPad(minutes)}:{zeroPad(seconds)}
    </span>
  )
export const PollOverlay = ({ title, choices, endDate }: PollData) => {
  const res = useTransformRes()

  const totalVotes = choices.reduce((acc, choice) => acc + choice.totalVotes, 0)
  const choicesWithPercent = choices.map((choice) => {
    const percent = !totalVotes
      ? Math.round(100 / choices.length)
      : Math.round((choice.totalVotes / totalVotes) * 100)
    return { ...choice, percent }
  })

  return (
    <motion.div key="poll-overlay" {...motionProps}>
      <div>
        <h1
          className="font-outline-2 text-center font-bold text-slate-50"
          style={{
            fontSize: res({ h: 20 }),
          }}
        >
          {title}
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
            color: PollColors[i],
          }))}
        />
        <Center>
          {endDate && (
            <Countdown renderer={PollTimer} date={new Date(endDate)} />
          )}
        </Center>
      </div>
    </motion.div>
  )
}
