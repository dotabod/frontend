import { motion } from 'framer-motion'
import WinLossCard from '@/components/Overlay/wl/WinLossCard'
import { transition } from '@/ui/utils'
import { useOverlayPositions } from '@/lib/hooks/useOverlayPositions'

export const AnimatedWL = ({
  wl,
  className = 'absolute',
  mainScreen = false,
}: {
  mainScreen?: boolean
  className?: string
  wl: { lose: number; type: string; win: number }[]
}) => {
  const { wlPosition } = useOverlayPositions()

  const style = mainScreen
    ? {
        fontSize: wlPosition.fontSize,
      }
    : wlPosition

  return (
    <motion.div
      key="mainscreen-wl"
      initial={{ scale: 0 }}
      transition={transition}
      animate={{
        scale: 1,
      }}
      exit={{ scale: 0 }}
      className={className}
      style={style}
    >
      <WinLossCard wl={wl} mainScreen={mainScreen} />
    </motion.div>
  )
}
