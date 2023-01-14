import { motion } from 'framer-motion'
import { Rankbadge } from '@/components/Overlay/rank/Rankbadge'
import { transition } from '@/ui/utils'

export const AnimatedRank_Mainscreen = ({
  badgePosition,
  rankImageDetails,
  right,
  top,
  transformRes,
}: {
  right: number
  badgePosition: { left: null; bottom: number; right: number }
  top: number
  rankImageDetails: { image: string; leaderboard: boolean; rank: number }
  transformRes: ({ height, width }: { height?: any; width?: any }) => number
}) => (
  <motion.div
    key="animated-rank-mainscreen"
    initial={{
      scale: 0,
      right: 0,
    }}
    transition={transition}
    animate={{
      scale: 1,
      right: right,
    }}
    exit={{ scale: 0, right: 0 }}
    className="absolute"
    style={{
      ...badgePosition,
      bottom: null,
      top: top,
      right: right,
    }}
  >
    <Rankbadge {...rankImageDetails} mainScreen transformRes={transformRes} />
  </motion.div>
)
