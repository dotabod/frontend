import { HeroBlocker } from '@/components/Overlay/blocker/HeroBlocker'
import { AnimatedRankBadge } from '@/components/Overlay/rank/AnimatedRankBadge'
import { AnimatedWL } from '@/components/Overlay/wl/AnimatedWL'
import { Settings } from '@/lib/defaultSettings'
import { useTransformRes } from '@/lib/hooks/useTransformRes'
import { useUpdateSetting } from '@/lib/hooks/useUpdateSetting'
import { motionProps } from '@/ui/utils'
import { clsx } from 'clsx'
import { motion } from 'framer-motion'

export const PickScreenOverlays = ({ rankImageDetails, wl, block: { team, type } }) => {
  const res = useTransformRes()
  const { data: shouldBlock } = useUpdateSetting(Settings['picks-blocker'])
  const { data: isRight } = useUpdateSetting(Settings.minimapRight)
  const hasPickScreen = ['picks', 'strategy', 'strategy-2'].includes(type)

  if (!hasPickScreen) return null

  const styles: {
    width: number
    height: number
    bottom: number
    right: number | undefined
    left: number | undefined
    zIndex: number
  } = {
    width: res({ w: 381 }),
    height: res({ h: 200 }),
    bottom: res({ h: 16 }),
    right: type === 'strategy-2' ? 0 : res({ w: 199 }),
    left: undefined,
    zIndex: 40,
  }

  if (isRight) {
    styles.bottom = 0
    styles.left = type === 'strategy-2' ? 0 : res({ w: 0 })
    styles.right = undefined
  }

  return (
    <>
      <div style={styles} className={clsx('absolute ')} id='picks-blocker-parent'>
        <div
          className={clsx(
            'flex h-full w-full items-end justify-end bg-slate-800/50 backdrop-blur-lg backdrop-filter',
            'absolute ',
            (type === 'strategy-2' || !shouldBlock || isRight) &&
              '!right-0 bg-slate-800/0 backdrop-blur-none backdrop-filter-none',
            isRight && '!justify-start',
          )}
        >
          <AnimatedWL className={clsx(isRight && 'order-2')} key='animate-wl-class-main' wl={wl} />
          <AnimatedRankBadge
            className={clsx(isRight && 'order-1')}
            key='animate-rank-badge-class-main'
            rankImageDetails={rankImageDetails}
          />
        </div>
      </div>
      {shouldBlock && (
        <motion.div key='animated-hero-blocker' {...motionProps} className='absolute'>
          <HeroBlocker type={type} teamName={team} />
        </motion.div>
      )}
    </>
  )
}
