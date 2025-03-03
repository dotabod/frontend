import { useMotionValue, useSpring } from 'framer-motion'
import { useEffect, useRef } from 'react'

interface AnimatedNumberProps {
  from: number
  to: number
}

export function AnimatedNumber({ from, to }: AnimatedNumberProps) {
  const ref = useRef<HTMLSpanElement>(null)
  const motionValue = useMotionValue(from)
  const springValue = useSpring(motionValue)

  useEffect(() => {
    motionValue.set(to)
  }, [motionValue, to])

  useEffect(() => {
    const unsubscribe = springValue.on('change', (latest: number) => {
      if (ref.current) {
        ref.current.textContent = Math.round(latest).toString()
      }
    })
    return unsubscribe
  }, [springValue])

  return <span ref={ref} />
}
