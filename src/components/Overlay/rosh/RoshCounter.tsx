import Countdown from 'react-countdown'
import { CountdownCircleTimer } from 'react-countdown-circle-timer'
import { RoshTimer } from './RoshTimer'
import { motionProps } from '@/ui/utils'
import { motion } from 'framer-motion'
import { useEffect, useRef } from 'react'
import { useTransformRes } from '@/lib/hooks/useTransformRes'
import { useOverlayPositions } from '@/lib/hooks/useOverlayPositions'

export const RoshCounter = ({
  color,
  count,
  date,
  duration,
  onComplete,
  paused,
}) => {
  const countdownRef = useRef<Countdown>()
  const res = useTransformRes()
  const { roshPosition: style } = useOverlayPositions()

  useEffect(() => {
    if (paused) {
      countdownRef.current?.api?.pause()
    } else {
      countdownRef.current?.api?.start()
    }
  }, [paused])

  return (
    <>
      <style global jsx>{`
        .rosh-timer svg {
          position: absolute;
          z-index: 30;
          top: ${res({ h: 8 })}px;
          left: ${res({ w: 5 })}px;
          height: ${res({ h: 42 })}px;
          width: ${res({ w: 42 })}px;
        }
        .rosh-timer > div {
          height: ${res({ h: 55 })}px !important;
          width: ${res({ w: 55 })}px !important;
        }
      `}</style>
      <motion.div
        key="rosh-counter"
        {...motionProps}
        style={style}
        className="rosh-timer absolute"
      >
        <CountdownCircleTimer
          isPlaying={!paused}
          duration={duration}
          colors={color === 'red' ? '#ff0000' : '#a39800'}
          trailColor="#0000000"
          size={res({
            w: 55,
          })}
          strokeWidth={res({
            w: 3,
          })}
        >
          {() => (
            <Countdown
              ref={countdownRef}
              date={date}
              renderer={RoshTimer({
                res: res,
                color: color,
                count: count,
              })}
              onComplete={onComplete}
            />
          )}
        </CountdownCircleTimer>
      </motion.div>
    </>
  )
}
