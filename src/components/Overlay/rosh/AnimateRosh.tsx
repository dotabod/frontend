import { motion } from 'framer-motion'
import { RoshCounter } from '@/components/Overlay/rosh/RoshCounter'
import Countdown from 'react-countdown'
import { transition } from '@/pages/overlay/[userId]'

interface AnimateRoshProps {
  style: { left: number; bottom: number; right: null }
  roshan: {
    minS: number
    minDate: string
    count: number
    maxDate: string
    maxS: number
  }
  paused: boolean
  onComplete: () => void
  transformRes: ({ height, width }: { height?: any; width?: any }) => number
  countdownRef: React.MutableRefObject<Countdown | undefined>
}

export const AnimateRosh = ({
  countdownRef,
  onComplete,
  paused,
  roshan: { count, maxDate, maxS, minDate, minS },
  style,
  transformRes,
}: AnimateRoshProps) => (
  <motion.div
    initial={{
      scale: 0,
    }}
    transition={transition}
    animate={{
      scale: 1,
    }}
    exit={{ scale: 0 }}
    style={style}
    className="rosh-timer absolute"
  >
    {(minDate || maxDate) && (
      <RoshCounter
        color={minDate ? 'red' : 'yellow'}
        duration={minS || maxS}
        date={minDate || maxDate}
        paused={paused}
        count={count}
        onComplete={onComplete}
        transformRes={transformRes}
        countdownRef={countdownRef}
      />
    )}
  </motion.div>
)
