import LastFmCard from '@/components/Overlay/lastfm/LastFmCard'
import { motionProps } from '@/ui/utils'
import { motion } from 'framer-motion'
import { useLastFm } from '@/lib/hooks/useLastFm'
import { useTransformRes } from '@/lib/hooks/useTransformRes'
import type { blockType } from '@/lib/devConsts'
import { Settings } from '@/lib/defaultSettings'
import { useUpdateSetting } from '@/lib/hooks/useUpdateSetting'

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
      width: res({ w: 581 }),
      height: res({ h: 200 }),
      bottom: res({ h: 75 }),
      right: res({ w: 199 }),
    },
    strategy: {
      width: res({ w: 581 }),
      height: res({ h: 200 }),
      bottom: res({ h: 75 }),
      right: res({ w: 199 }),
    },
    'strategy-2': {
      width: res({ w: 160 }),
      height: res({ h: 200 }),
      bottom: res({ h: 75 }),
      right: res({ w: 199 }),
    },
    playing: {
      right: res({ w: 175 }),
      width: res({ w: 368 }),
      height: res({ h: 65 }),
    },
    spectator: {
      right: res({ w: 175 }),
      width: res({ w: 368 }),
      height: res({ h: 65 }),
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
      right: res({ w: 0 }),
      left: undefined,
      width: res({ w: 247 }),
      height: res({ h: 65 }),
    }
  }

  if (!isEnabled || !track) return null

  return (
    <div
      id='main-screen-lastfm'
      className='absolute flex h-full items-center justify-center space-x-2'
      style={{
        right: styles.right,
        left: styles.left,
        width: styles.width,
        height: styles.height,
        bottom: styles.bottom,
        zIndex: 40,
      }}
    >
      <motion.div key='mainscreen-lastfm' {...motionProps} className={className} style={style}>
        <LastFmCard track={track} mainScreen={mainScreen} />
      </motion.div>
    </div>
  )
}
