import { MMRBadge } from '@/components/Overlay/rank/MMRBadge'
import { Settings } from '@/lib/defaultSettings'
import { useUpdateSetting } from '@/lib/hooks/useUpdateSetting'
import { motionProps } from '@/ui/utils'
import { motion } from 'framer-motion'

export const AnimatedRankBadge = ({
  rankImageDetails: rank,
  className = 'absolute',
  mainScreen,
}: {
  rankImageDetails: { image: string; leaderboard: boolean; rank: number }
  className?: string
  mainScreen?: boolean
}) => {
  const { data: showRankMmr } = useUpdateSetting(Settings.showRankMmr)
  const { data: showRankImage } = useUpdateSetting(Settings.showRankImage)
  const { data: showRankLeader } = useUpdateSetting(Settings.showRankLeader)

  return (
    <motion.div
      key="animated-rank-badge"
      {...motionProps}
      className={className}
      id="rank-badge-motion"
    >
      <MMRBadge
        leaderboard={showRankLeader ? rank?.leaderboard : null}
        image={showRankImage ? rank?.image : null}
        rank={showRankMmr ? rank?.rank : null}
        mainScreen={mainScreen}
      />
    </motion.div>
  )
}
