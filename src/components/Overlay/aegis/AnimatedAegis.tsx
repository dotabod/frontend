import { CountdownCircleTimer } from 'react-countdown-circle-timer'
import { AegisTimer } from '@/components/Overlay/aegis/AegisTimer'
import { PlayerTopbar } from '@/components/Overlay/PlayerTopbar'
import { Settings } from '@/lib/defaultSettings'
import type { blockType } from '@/lib/devConsts'
import { useTransformRes } from '@/lib/hooks/useTransformRes'
import { useUpdateSetting } from '@/lib/hooks/useUpdateSetting'

interface AnimatedAegisProps {
  block: blockType
  aegis: {
    expireS: number
    playerId: number
  }
  paused: boolean
  onComplete: () => void
}

export const AnimatedAegis = ({ aegis, paused, onComplete, block }: AnimatedAegisProps) => {
  const res = useTransformRes()
  const { data: isEnabled } = useUpdateSetting(Settings.aegis)

  if (!aegis || !block) return null
  if (!isEnabled || block.type !== 'playing' || !aegis.expireS) return null

  return (
    <PlayerTopbar position={aegis.playerId}>
      <CountdownCircleTimer
        isPlaying={!paused}
        duration={aegis.expireS}
        colors='#0000000'
        trailColor='#0000000'
        onComplete={onComplete}
        size={res({
          w: 55,
        })}
        strokeWidth={res({
          w: 3,
        })}
      >
        {(props) => {
          const totalSeconds = props.remainingTime
          // convert totalSeconds into minutes and seconds
          const minutes = Math.floor(totalSeconds / 60)
          const seconds = totalSeconds - minutes * 60

          return <AegisTimer minutes={minutes} seconds={seconds} res={res} />
        }}
      </CountdownCircleTimer>
    </PlayerTopbar>
  )
}
