import { motion } from 'framer-motion'
import { HeroBlocker } from '@/components/Overlay/blocker/HeroBlocker'
import { transition } from '@/ui/utils'
import { Settings } from '@/lib/defaultSettings'
import { useUpdateSetting } from '@/lib/hooks/useUpdateSetting'

export const AnimatedHeroBlocker = ({ block: { team, type } }) => {
  const { data: isEnabled } = useUpdateSetting(Settings['picks-blocker'])
  const shouldBlockPicks =
    isEnabled && ['picks', 'strategy', 'strategy-2'].includes(type)

  if (!shouldBlockPicks) return null

  return (
    <motion.div
      key="animated-hero-blocker"
      initial={{
        scale: 2,
      }}
      transition={transition}
      animate={{
        scale: 1,
      }}
      exit={{ scale: 0 }}
      className="absolute"
    >
      <HeroBlocker type={type} teamName={team} />
    </motion.div>
  )
}
