import { motion } from 'framer-motion'
import { HeroBlocker } from '@/components/Overlay/blocker/HeroBlocker'
import { transition } from '@/ui/utils'

export const AnimatedHeroBlocker = ({
  block: { team, type },
  transformRes,
}: {
  transformRes: ({ height, width }: { height?: any; width?: any }) => number
  block: { team: null; type: null; matchId: null }
}) => (
  <motion.div
    initial={{
      scale: 2,
    }}
    transition={transition}
    animate={{
      scale: 1,
    }}
    exit={{ scale: 0 }}
  >
    <HeroBlocker transformRes={transformRes} type={type} teamName={team} />
  </motion.div>
)
