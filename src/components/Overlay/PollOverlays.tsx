import { useTransformRes } from '@/lib/hooks/useTransformRes'
import { PollOverlay } from '@/components/Overlay/PollOverlay'
import { useUpdateSetting } from '@/lib/hooks/useUpdateSetting'
import { Settings } from '@/lib/defaultSettings'
import { AnimatePresence } from 'framer-motion'

export const PollOverlays = ({
  pollData,
  betData,
  setPollData,
  setBetData,
}) => {
  const res = useTransformRes()

  const { data: isEnabled } = useUpdateSetting(Settings.livePolls)

  if (!isEnabled || (!pollData && !betData)) return null

  return (
    <div
      className="absolute"
      style={{
        right: res({ w: 1920 / 2 - 200 }),
        top: res({ h: 115 }),
        width: res({ w: 400 }),
        zIndex: 1,
      }}
    >
      <AnimatePresence key="poll-primary">
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
