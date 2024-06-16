import { Settings } from '@/lib/defaultSettings'
import type { blockType } from '@/lib/devConsts'
import { useOverlayPositions } from '@/lib/hooks/useOverlayPositions'
import { useTransformRes } from '@/lib/hooks/useTransformRes'
import { useUpdateSetting } from '@/lib/hooks/useUpdateSetting'
import { selectStatus } from '@/lib/redux/store'
import { motionProps } from '@/ui/utils'
import { motion } from 'framer-motion'
import Image from 'next/image'
import { useSelector } from 'react-redux'
import Minimap from '../minimap'

export const OriginalMinimapBlocker = ({ block }: { block: blockType }) => {
  const { data: isSimple } = useUpdateSetting(Settings['minimap-simple'])
  const { data: isXL } = useUpdateSetting(Settings['minimap-xl'])
  const res = useTransformRes()

  return (
    <Image
      id="minimap-blocker"
      unoptimized
      priority
      alt="minimap blocker"
      width={
        isXL
          ? res({
              w: 280,
            })
          : res({
              w: 240,
            })
      }
      height={
        isXL
          ? res({
              h: 280,
            })
          : res({
              h: 240,
            })
      }
      src={`/images/overlay/minimap/731-${isSimple ? 'Simple' : 'Complex'}-${
        isXL ? 'X' : ''
      }Large-AntiStreamSnipeMap.png`}
    />
  )
}

export const MinimapBlocker = ({ block }: { block: blockType }) => {
  const { data: isEnabled } = useUpdateSetting(Settings['minimap-blocker'])

  const { minimapPosition } = useOverlayPositions()
  const { original } = useUpdateSetting()
  const status = useSelector(selectStatus)?.active

  const shouldBlockMap = isEnabled && block.type === 'playing'
  if (!shouldBlockMap) return null

  return (
    <motion.div
      key="minimap-blocker"
      {...motionProps}
      style={minimapPosition}
      className="absolute"
    >
      {status && original?.beta_tester ? (
        <Minimap block={block} />
      ) : (
        <OriginalMinimapBlocker block={block} />
      )}
    </motion.div>
  )
}
