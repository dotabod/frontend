import { motionProps } from '@/ui/utils'
import { motion } from 'framer-motion'
import { useTransformRes } from '@/lib/hooks/useTransformRes'
import { MatchTimer } from './MatchTimer'

export const FindMatch = () => {
  const res = useTransformRes()

  return (
    <>
      <span
        style={{
          fontSize: res({ w: 14 }),
          height: res({ h: 24 }),
          width: res({ w: 120 }),
          top: res({ h: 143 }),
          left: res({ w: 108 }),
        }}
        className="font-outline-2 absolute flex items-center rounded-sm bg-[#1b1c1f] font-semibold capitalize tracking-wide text-[#6a9461]"
      >
        Main menu
      </span>

      <MatchTimer res={res} />
    </>
  )
}
