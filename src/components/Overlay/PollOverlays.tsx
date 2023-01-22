import { useTransformRes } from '@/lib/hooks/useTransformRes'
import { PollOverlay } from '@/components/Overlay/PollOverlay'
import { useUpdateSetting } from '@/lib/hooks/useUpdateSetting'
import { Settings } from '@/lib/defaultSettings'

export const PollOverlays = ({ pollData, betData }) => {
  const res = useTransformRes()

  const { data: isEnabled } = useUpdateSetting(Settings.livePolls)

  if (!isEnabled) return null

  return (
    <>
      <div
        key="poll-primary"
        className="absolute"
        style={{
          right: res({ w: 1920 / 2 - 200 }),
          top: res({ h: 70 }),
          width: res({ w: 400 }),
        }}
      >
        {pollData && (
          <PollOverlay
            key="poll-overlay"
            endDate={pollData.endDate}
            title={pollData.title}
            choices={pollData.choices}
          />
        )}
        {betData && (
          <PollOverlay
            key="bet-overlay"
            endDate={betData.endDate}
            title={betData.title}
            choices={betData.outcomes}
          />
        )}
      </div>
    </>
  )
}
