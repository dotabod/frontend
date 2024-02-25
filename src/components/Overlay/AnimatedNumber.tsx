import { useMotionValue, useSpring } from 'framer-motion'
import { useEffect, useRef } from 'react'

export function AnimatedNumber({ from, to }) {
  const ref = useRef(null)
  const motionValue = useMotionValue(from)
  const springValue = useSpring(motionValue)

  useEffect(() => {
    motionValue.set(to)
  }, [motionValue, to])

  useEffect(
    () =>
      springValue.onChange((latest) => {
        if (ref.current) {
          ref.current.textContent = latest.toFixed(0)
        }
      }),
    [springValue]
  )

  return <span ref={ref} />
}
