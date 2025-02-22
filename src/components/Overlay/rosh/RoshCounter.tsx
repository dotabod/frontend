import { useOverlayPositions } from '@/lib/hooks/useOverlayPositions'
import { useTransformRes } from '@/lib/hooks/useTransformRes'
import { motionProps } from '@/ui/utils'
import { motion } from 'framer-motion'
import { CountdownCircleTimer } from 'react-countdown-circle-timer'
import { RoshTimer } from './RoshTimer'

export const RoshCounter = ({ color, count, duration, onComplete, paused }) => {
  const res = useTransformRes()
  const { roshPosition: style } = useOverlayPositions()

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
      <motion.div key='rosh-counter' {...motionProps} style={style} className='rosh-timer absolute'>
        <CountdownCircleTimer
          isPlaying={!paused}
          duration={duration}
          colors={color === 'red' ? '#ff0000' : '#a39800'}
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

            return (
              <RoshTimer
                minutes={minutes}
                seconds={seconds}
                res={res}
                color={props.color}
                roshanCount={count}
              />
            )
          }}
        </CountdownCircleTimer>
      </motion.div>
    </>
  )
}
