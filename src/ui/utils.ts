const transition = {
  type: 'spring' as const,
  stiffness: 260,
  damping: 20,
}

export const motionProps = {
  initial: { scale: 0 },
  animate: { scale: 1 },
  exit: { scale: 0 },
  transition,
}
