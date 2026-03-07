'use client'

import clsx from 'clsx'
import { motion, useMotionTemplate, useMotionValue } from 'framer-motion'
import { useEffect, useRef } from 'react'
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
  const cardRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const card = cardRef.current

    if (!card) {
      return
    }

    const handleMouseMove = (event: MouseEvent) => {
      const { left, top } = card.getBoundingClientRect()

      mouseX.set(event.clientX - left)
      mouseY.set(event.clientY - top)
    }

    card.addEventListener('mousemove', handleMouseMove)

    return () => {
      card.removeEventListener('mousemove', handleMouseMove)
    }
  }, [mouseX, mouseY])

  return (
    <div
      ref={cardRef}
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
    </div>
  )
}
