import { motion } from 'framer-motion'
import { HeroBlocker } from '@/components/Overlay/blocker/HeroBlocker'
import { motionProps } from '@/ui/utils'
import { Settings } from '@/lib/defaultSettings'
import { useUpdateSetting } from '@/lib/hooks/useUpdateSetting'
import { AnimatedWL } from '@/components/Overlay/wl/AnimatedWL'
import { AnimatedRankBadge } from '@/components/Overlay/rank/AnimatedRankBadge'
import { useTransformRes } from '@/lib/hooks/useTransformRes'

export const PickScreenOverlays = ({
  rankImageDetails,
  wl,
  block: { team, type },
}) => {
  const res = useTransformRes()
  const { data: isEnabled } = useUpdateSetting(Settings['picks-blocker'])
  const shouldBlockPicks =
    isEnabled && ['picks', 'strategy', 'strategy-2'].includes(type)

  return (
    <>
      {['strategy', 'picks'].includes(type) && (
        <div
          style={{
            right: res({ w: 40 }),
            bottom: res({ h: 100 }),
            width: res({ w: 100 }),
            height: res({ h: 150 }),
          }}
          className="absolute"
        >
          <AnimatedWL mainScreen key="animate-wl-class" wl={wl} />

          <AnimatedRankBadge
            mainScreen
            key="animate-rank-badge-class"
            rankImageDetails={rankImageDetails}
          />
        </div>
      )}
      {shouldBlockPicks && (
        <motion.div
          key="animated-hero-blocker"
          {...motionProps}
          className="absolute"
        >
          <HeroBlocker type={type} teamName={team} />
        </motion.div>
      )}
    </>
  )
}
