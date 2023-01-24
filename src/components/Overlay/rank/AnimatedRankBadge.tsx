import { motion } from 'framer-motion'
import { MMRBadge } from '@/components/Overlay/rank/MMRBadge'
import { motionProps } from '@/ui/utils'

export const AnimatedRankBadge = ({
  rankImageDetails,
  className = 'absolute',
  mainScreen,
}: {
  rankImageDetails: { image: string; leaderboard: boolean; rank: number }
  className?: string
  mainScreen?: boolean
}) => {
  return (
    <motion.div
      key="animated-rank-badge"
      {...motionProps}
      className={className}
    >
      <MMRBadge {...rankImageDetails} mainScreen={mainScreen} />
    </motion.div>
  )
}
