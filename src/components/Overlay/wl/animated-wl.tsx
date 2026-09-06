import { motion } from 'framer-motion'

import WinLossCard from '@/components/Overlay/wl/win-loss-card'
import { useOverlayPositions } from '@/lib/hooks/use-overlay-positions'
import type { wlType } from '@/lib/hooks/use-socket'
import { motionProps } from '@/ui/utils'

export const AnimatedWL = ({
  wl,
  className = 'absolute',
  mainScreen = false,
}: {
  mainScreen?: boolean
  className?: string
  wl: wlType
}) => {
  const { wlPosition } = useOverlayPositions()
  const style = mainScreen ? { fontSize: wlPosition.fontSize } : {}

  return (
    <motion.div key='mainscreen-wl' {...motionProps} className={className} style={style}>
      <WinLossCard wl={wl} mainScreen={mainScreen} />
    </motion.div>
  )
}
