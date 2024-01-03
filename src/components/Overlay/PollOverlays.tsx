import { useTransformRes } from '@/lib/hooks/useTransformRes'
import { PollOverlay } from '@/components/Overlay/PollOverlay'
import { useUpdateSetting } from '@/lib/hooks/useUpdateSetting'
import { Settings } from '@/lib/defaultSettings'
import { AnimatePresence } from 'framer-motion'
import { WinProbability } from './WinProbability'

export const PollOverlays = ({
  pollData,
  betData,
  radiantWinChance,
  setPollData,
  setBetData,
}) => {
  const res = useTransformRes()

  const { data: isEnabled } = useUpdateSetting(Settings.livePolls)
  const { data: isWinProbEnabled } = useUpdateSetting(
    Settings.winProbabilityOverlay,
  )

  if (!isEnabled || (!pollData && !betData && !isWinProbEnabled)) return null

  return (
    <div
      className="absolute space-y-6"
      id="poll-and-bet-overlay"
      style={{
        right: res({ w: 1920 / 2 - 200 }),
        top: res({ h: 115 }),
        width: res({ w: 400 }),
        zIndex: 1,
      }}
    >
      <AnimatePresence key="poll-primary">
        {isWinProbEnabled && (
          <WinProbability radiantWinChance={radiantWinChance} />
        )}
        {pollData && (
          <PollOverlay
            key="poll-overlay"
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
            key="bet-overlay"
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
