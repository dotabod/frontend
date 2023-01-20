import { motion } from 'framer-motion'
import WinLossCard from '@/components/Overlay/wl/WinLossCard'
import { motionProps } from '@/ui/utils'
import { useOverlayPositions } from '@/lib/hooks/useOverlayPositions'

export const AnimatedWL = ({
  wl,
  className = 'absolute',
  isLeaderboard = false,
  mainScreen = false,
}: {
  mainScreen?: boolean
  isLeaderboard?: boolean
  className?: string
  wl: { lose: number; type: string; win: number }[]
}) => {
  const { wlPosition } = useOverlayPositions({ isLeaderboard })

  const style = mainScreen
    ? {
        fontSize: wlPosition.fontSize,
      }
    : wlPosition

  return (
    <motion.div
      key="mainscreen-wl"
      {...motionProps}
      className={className}
      style={style}
    >
      <WinLossCard wl={wl} mainScreen={mainScreen} />
    </motion.div>
  )
}
