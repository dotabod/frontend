import { motion } from 'framer-motion'
import type React from 'react'

import { usePlayerPositions } from '@/lib/hooks/use-overlay-positions'
import { useTransformRes } from '@/lib/hooks/use-transform-res'
import { motionProps } from '@/ui/utils'

export const PlayerTopbar = ({
  children,
  position,
}: {
  position: number
  children: React.ReactNode
}) => {
  const res = useTransformRes()
  const { playerPositions } = usePlayerPositions()
  position = playerPositions[position]

  return (
    <motion.div
      key={`topbar-for-player-${position}`}
      {...motionProps}
      id={`topbar-for-player-${position}`}
      style={{
        left: position + res({ w: 15 }),
        maxHeight: res({ h: 100 }),
        top: res({ h: 65 }),
        width: res({ w: 62 }),
      }}
      className='absolute space-x-1 truncate text-center text-sm leading-none break-all whitespace-pre-wrap text-white/90'
    >
      {children}
    </motion.div>
  )
}
