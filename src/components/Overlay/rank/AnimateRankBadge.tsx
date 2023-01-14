import { motion } from 'framer-motion'
import { Rankbadge } from '@/components/Overlay/rank/Rankbadge'
import { transition } from '@/ui/utils'

export const AnimateRankBadge = ({
  badgePosition,
  rankImageDetails,
  transformRes,
}: {
  badgePosition: { left: null; bottom: number; right: number }
  rankImageDetails: { image: string; leaderboard: boolean; rank: number }
  transformRes: ({ height, width }: { height?: any; width?: any }) => number
}) => (
  <motion.div
    key="animated-rank-badge"
    initial={{
      right: badgePosition.right * -1,
    }}
    transition={{ ...transition, delay: 0.3 }}
    animate={{
      right: badgePosition.right,
    }}
    exit={{ right: badgePosition.right * -1 }}
    className="absolute"
    style={badgePosition}
  >
    <Rankbadge {...rankImageDetails} transformRes={transformRes} />
  </motion.div>
)
