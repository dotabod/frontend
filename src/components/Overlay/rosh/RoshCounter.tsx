import Countdown from 'react-countdown'
import { CountdownCircleTimer } from 'react-countdown-circle-timer'
import { RoshTimer } from './RoshTimer'

export const RoshCounter = ({
  color,
  count,
  countdownRef,
  date,
  duration,
  onComplete,
  paused,
  transformRes,
}) => (
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
)
