import Countdown from 'react-countdown'
import { CountdownCircleTimer } from 'react-countdown-circle-timer'
import { RoshTimer } from './RoshTimer'
import { transition } from '@/ui/utils'
import { motion } from 'framer-motion'

export const RoshCounter = ({
  color,
  count,
  countdownRef,
  date,
  duration,
  onComplete,
  paused,
  transformRes,
  style,
}) => (
  <motion.div
    initial={{
      bottom: -50,
    }}
    transition={transition}
    animate={{
      bottom: style.bottom,
    }}
    exit={{ bottom: -50 }}
    style={style}
    className="rosh-timer absolute"
  >
    <CountdownCircleTimer
      isPlaying={!paused}
      duration={duration}
      colors={color === 'red' ? '#ff0000' : '#a39800'}
      trailColor="#0000000"
      size={transformRes({
        width: 55,
      })}
      strokeWidth={transformRes({
        width: 3,
      })}
    >
      {() => (
        <Countdown
          ref={countdownRef}
          date={date}
          renderer={RoshTimer({
            transformRes: transformRes,
            color: color,
            count: count,
          })}
          onComplete={onComplete}
        />
      )}
    </CountdownCircleTimer>
  </motion.div>
)
