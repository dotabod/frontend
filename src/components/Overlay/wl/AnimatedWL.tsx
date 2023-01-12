import { motion } from 'framer-motion'
import WinLossCard from '@/components/Overlay/wl/WinLossCard'
import { transition } from '@/ui/utils'

export const AnimatedWL = ({
  number,
  number1,
  right,
  wl,
  wlPosition,
}: {
  right: number
  wlPosition: { left: null; bottom: number; fontSize: number; right: number }
  wl: { lose: number; type: string; win: number }[]
  number: number
  number1: number
}) => (
  <motion.div
    initial={{
      scale: 0,
      right: 0,
    }}
    transition={transition}
    animate={{
      scale: 1,
      right: right,
    }}
    exit={{ scale: 0, right: 0 }}
    className="absolute"
    style={{
      ...wlPosition,
      bottom: null,
      top: wl.length > 1 ? number : number1,
      right: right,
    }}
  >
    <WinLossCard wl={wl} mainScreen />
  </motion.div>
)
