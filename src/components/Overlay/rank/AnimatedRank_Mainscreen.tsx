import { motion } from 'framer-motion'
import { Rankbadge } from '@/components/Overlay/rank/Rankbadge'
import { transition } from '@/ui/utils'

export const AnimatedRank_Mainscreen = ({
  rankImageDetails,
  transformRes,
}: {
  rankImageDetails: { image: string; leaderboard: boolean; rank: number }
  transformRes: ({ height, width }: { height?: any; width?: any }) => number
}) => (
  <motion.div
    key="animated-rank-mainscreen"
    initial={{ scale: 0 }}
    transition={transition}
    animate={{ scale: 1 }}
    exit={{ scale: 0 }}
    className="relative h-full"
  >
    <Rankbadge {...rankImageDetails} mainScreen transformRes={transformRes} />
  </motion.div>
)
