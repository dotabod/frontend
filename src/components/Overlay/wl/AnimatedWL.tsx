import { motion } from 'framer-motion'
import WinLossCard from '@/components/Overlay/wl/WinLossCard'
import { transition } from '@/ui/utils'

export const AnimatedWL = ({
  wl,
  style,
}: {
  style: any
  wl: { lose: number; type: string; win: number }[]
}) => (
  <motion.div
    key="mainscreen-wl"
    initial={{ scale: 0 }}
    transition={transition}
    animate={{
      scale: 1,
    }}
    exit={{ scale: 0 }}
    className="relative flex h-full items-center"
    style={style}
  >
    <WinLossCard wl={wl} mainScreen />
  </motion.div>
)
