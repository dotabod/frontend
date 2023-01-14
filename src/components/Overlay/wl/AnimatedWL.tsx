import { motion } from 'framer-motion'
import WinLossCard from '@/components/Overlay/wl/WinLossCard'
import { transition } from '@/ui/utils'

export const AnimatedWL = ({
  wl,
  wlPosition,
}: {
  wlPosition: {
    left: null
    bottom: number
    fontSize: number
    right: number
    top: number
  }
  wl: { lose: number; type: string; win: number }[]
}) => (
  <motion.div
    key="mainscreen-wl"
    initial={{
      scale: 0,
      right: 0,
    }}
    transition={transition}
    animate={{
      scale: 1,
      right: wlPosition.right,
    }}
    exit={{ scale: 0, right: 0 }}
    className="relative flex h-full items-center"
    style={wlPosition}
  >
    <WinLossCard wl={wl} mainScreen />
  </motion.div>
)
