import { MatchTimer } from './MatchTimer'
import { motionProps } from '@/ui/utils'
import { motion } from 'framer-motion'
import { useTransformRes } from '@/lib/hooks/useTransformRes'
import { useEffect, useState } from 'react'

// random number between 15 minutes and maximum 99 minutes
function getRandomNumber() {
  return Math.floor(Math.random() * 99 * 60) + 15 * 60
}

export const FindMatch = () => {
  const res = useTransformRes()

  const [duration, setDuration] = useState(0)

  useEffect(() => {
    setDuration(getRandomNumber())

    const timer = setInterval(() => {
      setDuration((duration) => duration + 1)
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  return (
    <>
      <motion.div
        key="match-counter"
        {...motionProps}
        style={{
          fontSize: res({ w: 14 }),
          bottom: res({ h: 73 }), // correct is n
          right: res({ w: 55 }), // correct is 50
        }}
        className="match-timer absolute"
      >
        <MatchTimer duration={duration} res={res} />
      </motion.div>
    </>
  )
}
