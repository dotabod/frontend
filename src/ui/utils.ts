const transition = {
  damping: 20,
  stiffness: 260,
  type: 'spring' as const,
}

export const motionProps = {
  animate: { scale: 1 },
  exit: { scale: 0 },
  initial: { scale: 0 },
  transition,
}
