import Countdown from 'react-countdown'
import { motion } from 'framer-motion'
import { AegisTimer } from '@/components/Overlay/aegis/AegisTimer'
import { motionProps } from '@/ui/utils'
import { useEffect, useRef } from 'react'
import { usePlayerPositions } from '@/lib/hooks/useOverlayPositions'
import { useTransformRes } from '@/lib/hooks/useTransformRes'
import { Settings } from '@/lib/defaultSettings'
import { useUpdateSetting } from '@/lib/hooks/useUpdateSetting'

export const AnimatedAegis = ({
  aegis: { expireDate, playerId },
  paused,
  onComplete,
  block,
  top,
}: {
  paused: boolean
  aegis: {
    expireS: number
    expireTime: string
    expireDate: string
    playerId: number
  }
  block: any
  top: number
  onComplete: () => void
}) => {
  const res = useTransformRes()
  const aegisRef = useRef<Countdown>()
  const { playerPositions } = usePlayerPositions()
  const { data: isEnabled } = useUpdateSetting(Settings.aegis)

  useEffect(() => {
    if (paused) {
      aegisRef.current?.api?.pause()
    } else {
      aegisRef.current?.api?.start()
    }
  }, [paused])

  if (!isEnabled || block.type !== 'playing' || !expireDate) {
    return null
  }

  return (
    <motion.div
      key="aegis-counter"
      {...motionProps}
      style={{
        left: playerPositions[playerId],
        top: top,
      }}
      className={`absolute text-white/90`}
    >
      <Countdown
        date={expireDate}
        renderer={AegisTimer(res)}
        ref={aegisRef}
        onComplete={onComplete}
      />
    </motion.div>
  )
}
