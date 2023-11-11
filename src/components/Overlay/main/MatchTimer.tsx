import { motionProps } from '@/ui/utils'
import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { zeroPad } from 'react-countdown'

// random number between 15 minutes and maximum 99 minutes
function getRandomNumber() {
  return Math.floor(Math.random() * 99 * 60) + 15 * 60
}

export const MatchTimer = ({ res }) => {
  const [duration, setDuration] = useState(0)

  useEffect(() => {
    setDuration(getRandomNumber())

    const timer = setInterval(() => {
      setDuration((duration) => duration + 1)
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  const minutes = Math.floor(duration / 60)
  const seconds = duration % 60

  return (
    <motion.div
      key="match-counter"
      {...motionProps}
      style={{
        fontSize: res({ w: 14 }),
        bottom: res({ h: 73 }), // correct is n
        right: res({ w: 55 }), // correct is 50
      }}
      id="match-timer"
      className="match-timer absolute"
    >
      <div className="flex text-center">
        <span className="z-40 m-0 rounded bg-[#6380a3] px-1 tracking-wide text-white">
          {minutes}:{zeroPad(seconds)}
        </span>
      </div>
    </motion.div>
  )
}
