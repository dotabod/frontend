import { AnimatePresence } from 'framer-motion'
import { useEffect, useState } from 'react'
import { PollOverlay } from '@/components/Overlay/PollOverlay'
import { Settings } from '@/lib/defaultSettings'
import { useTransformRes } from '@/lib/hooks/useTransformRes'
import { useUpdateSetting } from '@/lib/hooks/useUpdateSetting'
import { WinProbability } from './WinProbability'

export const PollOverlays = ({ pollData, betData, radiantWinChance, setPollData, setBetData }) => {
  const res = useTransformRes()
  const [isVisible, setIsVisible] = useState(true)
  const { data: isEnabled } = useUpdateSetting(Settings.livePolls)
  const { data: isWinProbEnabled } = useUpdateSetting(Settings.winProbabilityOverlay)

  useEffect(() => {
    if (pollData || betData) {
      setIsVisible(true)
      const timer = setTimeout(() => {
        setIsVisible(false)
        setPollData(null)
        setBetData(null)
      }, 30000) // 30 seconds

      return () => clearTimeout(timer)
    }
  }, [pollData, betData, setPollData, setBetData])

  if (!isEnabled || (!pollData && !betData && !isWinProbEnabled) || !isVisible) return null

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
        {isWinProbEnabled && <WinProbability radiantWinChance={radiantWinChance} />}
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
