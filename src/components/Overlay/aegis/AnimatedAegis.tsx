import Countdown from 'react-countdown'
import { motion } from 'framer-motion'
import { AegisTimer } from '@/components/Overlay/aegis/AegisTimer'
import { transition } from '@/ui/utils'

export const AnimatedAegis = ({
  aegis: { expireDate, playerId },
  numbers,
  onComplete,
  aegisRef,
  top,
  transformRes,
}: {
  numbers: number[]
  aegis: {
    expireS: number
    expireTime: string
    expireDate: string
    playerId: number
  }
  top: number
  transformRes: ({ height, width }: { height?: any; width?: any }) => number
  aegisRef: React.MutableRefObject<Countdown | undefined>
  onComplete: () => void
}) => (
  <motion.div
    initial={{
      scale: 2,
    }}
    transition={transition}
    animate={{
      scale: 1,
    }}
    exit={{ scale: 0 }}
    style={{
      left: numbers[playerId],
      top: top,
    }}
    className={`absolute text-white/90`}
  >
    <Countdown
      date={expireDate}
      renderer={AegisTimer(transformRes)}
      ref={aegisRef}
      onComplete={onComplete}
    />
  </motion.div>
)
