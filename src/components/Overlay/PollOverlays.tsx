import { AnimatePresence } from 'framer-motion'
import type { Dispatch, SetStateAction } from 'react'
import { type PollData, PollOverlay } from '@/components/Overlay/PollOverlay'
import { Settings } from '@/lib/defaultSettings'
import { useTransformRes } from '@/lib/hooks/useTransformRes'
import { useUpdateSetting } from '@/lib/hooks/useUpdateSetting'
import { WinProbability } from './WinProbability'

type BetData = {
  title: string
  endDate: PollData['endDate']
  outcomes: { title: string; totalVotes: number; channelPoints: number }[]
} | null

interface PollOverlaysProps {
  pollData: PollData | null | undefined
  betData: BetData
  radiantWinChance: { value: number; time: number; visible: boolean } | null | undefined
  setPollData: Dispatch<SetStateAction<PollData | null>>
  setBetData: Dispatch<SetStateAction<BetData>>
}

export const PollOverlays = ({
  pollData,
  betData,
  radiantWinChance,
  setPollData,
  setBetData,
}: PollOverlaysProps) => {
  const res = useTransformRes()
  const { data: isEnabled } = useUpdateSetting(Settings.livePolls)
  const { data: isWinProbEnabled } = useUpdateSetting(Settings.winProbabilityOverlay)

  if (!isEnabled || (!pollData && !betData && !isWinProbEnabled)) {
    return null
  }

  return (
    <div
      className='absolute'
      id='poll-and-bet-overlay'
      style={{
        right: res({ w: 1920 / 2 - 200 }),
        top: res({ h: 115 }),
        width: res({ w: 400 }),
        zIndex: 1,
      }}
    >
      <AnimatePresence key='poll-primary'>
        {isWinProbEnabled && radiantWinChance && (
          <WinProbability radiantWinChance={radiantWinChance} />
        )}
        {pollData && (
          <PollOverlay
            key='poll-overlay'
            endDate={pollData.endDate}
            title={pollData.title}
            choices={pollData.choices}
            onComplete={() => {
              setPollData(null)
            }}
          />
        )}
        {betData && (
          <PollOverlay
            key='bet-overlay'
            endDate={betData.endDate}
            title={betData.title}
            choices={betData.outcomes}
            onComplete={() => {
              setBetData(null)
            }}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
