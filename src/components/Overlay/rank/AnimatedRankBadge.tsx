import { motion } from 'framer-motion'
import { Rankbadge } from '@/components/Overlay/rank/Rankbadge'
import { transition } from '@/ui/utils'
import { useOverlayPositions } from '@/lib/hooks/useOverlayPositions'

export const AnimatedRankBadge = ({
  rankImageDetails,
  className = 'absolute',
  mainScreen,
}: {
  rankImageDetails: { image: string; leaderboard: boolean; rank: number }
  className?: string
  mainScreen?: boolean
}) => {
  let { badgePosition } = useOverlayPositions()

  return (
    <motion.div
      key="animated-rank-badge"
      initial={{
        scale: 0,
      }}
      transition={{ ...transition, delay: 0.3 }}
      animate={{
        scale: 1,
      }}
      exit={{ scale: 0 }}
      style={!mainScreen ? badgePosition : null}
      className={className}
    >
      <Rankbadge {...rankImageDetails} mainScreen={mainScreen} />
    </motion.div>
  )
}
