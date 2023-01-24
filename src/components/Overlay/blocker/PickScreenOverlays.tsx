import { motion } from 'framer-motion'
import { HeroBlocker } from '@/components/Overlay/blocker/HeroBlocker'
import { motionProps } from '@/ui/utils'
import { Settings } from '@/lib/defaultSettings'
import { useUpdateSetting } from '@/lib/hooks/useUpdateSetting'
import { AnimatedWL } from '@/components/Overlay/wl/AnimatedWL'
import { AnimatedRankBadge } from '@/components/Overlay/rank/AnimatedRankBadge'
import { useTransformRes } from '@/lib/hooks/useTransformRes'
import { clsx } from '@mantine/styles'

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
          width: res({ w: 381 }),
          height: res({ h: 200 }),
          bottom: res({ h: 16 }),
          right: type === 'strategy-2' ? 0 : res({ w: 199 }),
          zIndex: 40,
        }}
        className={clsx('absolute ')}
      >
        <div
          className={clsx(
            'flex h-full w-full items-end justify-end bg-slate-800/50 backdrop-blur-lg backdrop-filter',
            'absolute ',
            type === 'strategy-2' &&
              '!right-0 bg-slate-800/0 backdrop-blur-none backdrop-filter-none'
          )}
        >
          <AnimatedWL className="" key="animate-wl-class-main" wl={wl} />
          <AnimatedRankBadge
            className=""
            key="animate-rank-badge-class-main"
            rankImageDetails={rankImageDetails}
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
