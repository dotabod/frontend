'use client'

import clsx from 'clsx'
import { motion, useMotionTemplate, useMotionValue } from 'framer-motion'
import type React from 'react'

interface MagicCardProps {
  children: React.ReactNode
  className?: string
  gradientSize?: number
  gradientColor?: string
  gradientOpacity?: number
}

export function MagicCard({
  children,
  className = '',
  gradientSize = 200,
  gradientColor = '#262626',
}: MagicCardProps) {
  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)

  return (
    <button
      type='button'
      onMouseMove={(e) => {
        const { left, top } = e.currentTarget.getBoundingClientRect()

        mouseX.set(e.clientX - left)
        mouseY.set(e.clientY - top)
      }}
      className={clsx('group relative flex size-full overflow-hidden', className)}
    >
      <div className='relative pointer-events-none z-20 w-full'>{children}</div>
      <motion.div
        className='absolute pointer-events-none -inset-px opacity-0 transition duration-300 group-hover:opacity-100'
        style={{
          background: useMotionTemplate`
      radial-gradient(${gradientSize}px circle at ${mouseX}px ${mouseY}px, ${gradientColor}, transparent 100%)
    `,
        }}
      />
    </button>
  )
}
