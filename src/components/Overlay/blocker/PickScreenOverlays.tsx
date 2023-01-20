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
  const { data: shouldBlock } = useUpdateSetting(Settings['picks-blocker'])
  const hasPickScreen = ['picks', 'strategy', 'strategy-2'].includes(type)

  if (!hasPickScreen) return null

  return (
    <>
      <div
        style={{
          width: res({ w: 200 }),
          height: 150,
          bottom: res({ h: 300 }),
          right: 0,
        }}
        className="absolute"
      >
        <div className="flex h-full flex-col items-center">
          <AnimatedRankBadge
            mainScreen
            key="animate-rank-badge-class-main"
            className="relative h-full"
            rankImageDetails={rankImageDetails}
          />
          <AnimatedWL
            mainScreen
            className="relative flex h-full items-center"
            key="animate-wl-class-main"
            wl={wl}
          />
        </div>
      </div>
      {shouldBlock && (
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
