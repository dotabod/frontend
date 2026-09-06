import { motion } from 'framer-motion'

import LastFmCard from '@/components/Overlay/lastfm/last-fm-card'
import { Settings } from '@/lib/default-settings'
import type { blockType } from '@/lib/dev-consts'
import { useLastFm } from '@/lib/hooks/use-last-fm'
import { useTransformRes } from '@/lib/hooks/use-transform-res'
import { useUpdateSetting } from '@/lib/hooks/use-update-setting'
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
  const positions: Partial<
    Record<
      NonNullable<blockType['type']>,
      {
        width: number
        bottom?: number
        right: number
        height: number
      }
    >
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

  const position = block.type ? positions[block.type] : undefined
  let styles: {
    width?: number
    height?: number
    bottom?: number
    right?: number
    left?: number
    zIndex?: number
  } = position ?? {}

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
