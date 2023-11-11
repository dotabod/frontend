import React from 'react'
import { useTransformRes } from '@/lib/hooks/useTransformRes'
import { motion } from 'framer-motion'
import { motionProps } from '@/ui/utils'
import { usePlayerPositions } from '@/lib/hooks/useOverlayPositions'

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
        top: res({ h: 65 }),
        width: res({ w: 62 }),
        left: position + res({ w: 15 }),
        maxHeight: res({ h: 100 }),
      }}
      className={`absolute space-x-1 truncate whitespace-pre-wrap break-all text-center text-sm leading-none text-white/90`}
    >
      {children}
    </motion.div>
  )
}
