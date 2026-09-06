import { motion } from 'framer-motion'

import { MMRBadge } from '@/components/Overlay/rank/mmr-badge'
import { Settings } from '@/lib/default-settings'
import { useUpdateSetting } from '@/lib/hooks/use-update-setting'
import { motionProps } from '@/ui/utils'

export const AnimatedRankBadge = ({
  rankImageDetails: rank,
  className = 'absolute',
  mainScreen,
}: {
  rankImageDetails: {
    image: string | null
    leaderboard: number | null
    rank: number | null
  }
  className?: string
  mainScreen?: boolean
}) => {
  const { data: showRankMmr } = useUpdateSetting(Settings.showRankMmr)
  const { data: showRankImage } = useUpdateSetting(Settings.showRankImage)
  const { data: showRankLeader } = useUpdateSetting(Settings.showRankLeader)

  return (
    <motion.div
      key='animated-rank-badge'
      {...motionProps}
      className={className}
      id='rank-badge-motion'
    >
      <MMRBadge
        leaderboard={showRankLeader ? rank?.leaderboard : undefined}
        image={showRankImage ? rank?.image : undefined}
        rank={showRankMmr ? rank?.rank : undefined}
        mainScreen={mainScreen}
      />
    </motion.div>
  )
}
