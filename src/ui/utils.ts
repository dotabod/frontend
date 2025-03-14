const transition = {
  type: 'spring',
  stiffness: 260,
  damping: 20,
}

export const motionProps = {
  initial: { scale: 0 },
  animate: { scale: 1 },
  exit: { scale: 0 },
  transition,
}
