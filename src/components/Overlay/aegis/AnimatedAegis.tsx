import { AegisTimer } from '@/components/Overlay/aegis/AegisTimer'
import { useTransformRes } from '@/lib/hooks/useTransformRes'
import { Settings } from '@/lib/defaultSettings'
import { useUpdateSetting } from '@/lib/hooks/useUpdateSetting'
import { CountdownCircleTimer } from 'react-countdown-circle-timer'
import { PlayerTopbar } from '@/components/Overlay/PlayerTopbar'

export const AnimatedAegis = ({
  aegis: { expireS, playerId },
  paused,
  onComplete,
  block,
}: {
  paused: boolean
  aegis: {
    expireS: number
    playerId: number
  }
  block: any
  onComplete: () => void
}) => {
  const res = useTransformRes()
  const { data: isEnabled } = useUpdateSetting(Settings.aegis)

  if (!isEnabled || block.type !== 'playing' || !expireS) {
    return null
  }

  return (
    <PlayerTopbar position={playerId}>
      <CountdownCircleTimer
        isPlaying={!paused}
        duration={expireS}
        colors="#0000000"
        trailColor="#0000000"
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
