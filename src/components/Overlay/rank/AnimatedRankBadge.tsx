import { motion } from 'framer-motion'
import { Rankbadge } from '@/components/Overlay/rank/Rankbadge'
import { motionProps } from '@/ui/utils'
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
      {...motionProps}
      style={!mainScreen ? badgePosition : null}
      className={className}
    >
      <Rankbadge {...rankImageDetails} mainScreen={mainScreen} />
    </motion.div>
  )
}
