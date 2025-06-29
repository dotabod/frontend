import { motion } from 'framer-motion'
import WinLossCard from '@/components/Overlay/wl/WinLossCard'
import { useOverlayPositions } from '@/lib/hooks/useOverlayPositions'
import { motionProps } from '@/ui/utils'

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
  const style = mainScreen ? { fontSize: wlPosition.fontSize } : {}

  return (
    <motion.div key='mainscreen-wl' {...motionProps} className={className} style={style}>
      <WinLossCard wl={wl} mainScreen={mainScreen} />
    </motion.div>
  )
}
