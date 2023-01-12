import Countdown from 'react-countdown'
import { CountdownCircleTimer } from 'react-countdown-circle-timer'
import { RoshTimer } from './RoshTimer'

export const RoshCounter = (props) => (
  <CountdownCircleTimer
    isPlaying={!props.paused}
    duration={props.duration}
    colors={props.color === 'red' ? '#ff0000' : '#a39800'}
    trailColor="#0000000"
    size={props.transformRes({
      width: 55,
    })}
    strokeWidth={props.transformRes({
      width: 3,
    })}
  >
    {({ remainingTime }) => (
      <Countdown
        ref={props.countdownRef}
        date={props.date}
        renderer={RoshTimer({
          transformRes: props.transformRes,
          color: props.color,
          count: props.count,
        })}
        onComplete={props.onComplete}
      />
    )}
  </CountdownCircleTimer>
)
