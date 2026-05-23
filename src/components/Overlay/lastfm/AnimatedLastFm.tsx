import { motion } from 'framer-motion'
import LastFmCard from '@/components/Overlay/lastfm/LastFmCard'
import { Settings } from '@/lib/defaultSettings'
import type { blockType } from '@/lib/devConsts'
import { useLastFm } from '@/lib/hooks/useLastFm'
import { useTransformRes } from '@/lib/hooks/useTransformRes'
import { useUpdateSetting } from '@/lib/hooks/useUpdateSetting'
import { motionProps } from '@/ui/utils'

export const AnimatedLastFm = ({
  className = 'absolute',
  mainScreen = false,
  block,
}: {
  mainScreen?: boolean
  className?: string
  block: blockType
}) => {
  const { data: isEnabled } = useUpdateSetting(Settings.lastFmOverlay)
  const res = useTransformRes()
  const style = mainScreen ? { fontSize: res({ w: 18 }) } : {}
  const { track } = useLastFm()
  const positions: Record<
    NonNullable<blockType['type']>,
    {
      width: number
      bottom?: number
      right: number
      height: number
    }
  > = {
    picks: {
      bottom: res({ h: 125 }),
      height: res({ h: 85 }),
      right: res({ w: 199 }),
      width: res({ w: 379 }),
    },
    playing: {
      height: res({ h: 65 }),
      right: res({ w: 175 }),
      width: res({ w: 368 }),
    },
    spectator: {
      height: res({ h: 65 }),
      right: res({ w: 175 }),
      width: res({ w: 368 }),
    },
    strategy: {
      bottom: res({ h: 125 }),
      height: res({ h: 85 }),
      right: res({ w: 199 }),
      width: res({ w: 379 }),
    },
    'strategy-2': {
      bottom: res({ h: 125 }),
      height: res({ h: 85 }),
      right: res({ w: 0 }),
      width: res({ w: 381 }),
    },
  }

  let styles: {
    width?: number
    height?: number
    bottom?: number
    right?: number
    left?: number
    zIndex?: number
  } = block.type && positions[block.type] ? positions[block.type] : {}

  if (mainScreen || !styles?.width) {
    styles = {
      height: res({ h: 59 }),
      left: undefined,
      right: res({ w: 0 }),
      width: res({ w: 305 }),
    }
  }

  if (!isEnabled || !track) {
    return null
  }

  return (
    <div
      id='main-screen-lastfm'
      className='absolute flex h-full items-center justify-center space-x-2'
      style={{
        bottom: styles.bottom,
        height: styles.height,
        left: styles.left,
        right: styles.right,
        width: styles.width,
        zIndex: 40,
      }}
    >
      <motion.div key='mainscreen-lastfm' {...motionProps} className={className} style={style}>
        <LastFmCard track={track} mainScreen={mainScreen} />
      </motion.div>
    </div>
  )
}
