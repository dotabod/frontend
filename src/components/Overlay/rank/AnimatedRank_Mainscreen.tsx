import { motion } from 'framer-motion'
import { Rankbadge } from '@/components/Overlay/rank/Rankbadge'
import { transition } from '@/ui/utils'

export const AnimatedRank_Mainscreen = ({
  badgePosition,
  rankImageDetails,
  transformRes,
}: {
  badgePosition: { left: null; bottom: number; right: number; top: number }
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
      right: badgePosition.right,
    }}
    exit={{ scale: 0, right: 0 }}
    className="relative h-full"
    style={{
      ...badgePosition,
      bottom: null,
    }}
  >
    <Rankbadge {...rankImageDetails} mainScreen transformRes={transformRes} />
  </motion.div>
)
