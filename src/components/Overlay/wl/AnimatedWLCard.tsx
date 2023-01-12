import { motion } from 'framer-motion'
import WinLossCard from '@/components/Overlay/wl/WinLossCard'
import { transition } from '@/ui/utils'

export const AnimatedWLCard = ({
  wl,
  wlPosition,
}: {
  wlPosition: { left: null; bottom: number; fontSize: number; right: number }
  wl: { lose: number; type: string; win: number }[]
}) => (
  <motion.div
    initial={{
      right: wlPosition.right * -1,
    }}
    transition={transition}
    animate={{
      right: wlPosition.right,
    }}
    exit={{ right: wlPosition.right * -1 }}
    className="absolute"
    style={wlPosition}
  >
    <WinLossCard wl={wl} />
  </motion.div>
)
