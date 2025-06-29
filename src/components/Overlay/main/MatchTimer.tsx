import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { zeroPad } from 'react-countdown'
import { Settings } from '@/lib/defaultSettings'
import { useUpdateSetting } from '@/lib/hooks/useUpdateSetting'
import { motionProps } from '@/ui/utils'

export const MatchTimer = ({ res }) => {
  const [duration, setDuration] = useState(0)
  const { data: findMatchText } = useUpdateSetting(Settings.queueBlockerFindMatchText)

  useEffect(() => {
    const timer = setInterval(() => {
      setDuration((duration) => duration + 1)
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  const minutes = Math.floor(duration / 60)
  const seconds = duration % 60

  return (
    <motion.div
      key='match-counter'
      {...motionProps}
      style={{
        bottom: res({ h: 72 }),
        right: res({ w: 15 }),
        width: res({ w: 469 }),
        height: res({ h: 24 }),
      }}
      id='match-timer'
      className='match-timer absolute flex space-x-4'
    >
      <span className='pt-1 align-bottom font-[Radiance] text-base font-thin uppercase tracking-wide text-[#99dfee]'>
        {findMatchText}
      </span>
      <span className='align-bottom font-[Radiance] text-base font-thin tracking-[1px] text-white transition-opacity duration-[0.3s] ease-[ease-in]'>
        {minutes}:{zeroPad(seconds)}
      </span>
    </motion.div>
  )
}
