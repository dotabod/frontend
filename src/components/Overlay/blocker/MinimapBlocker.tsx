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

const OriginalMinimapBlocker = ({ block }: { block: blockType }) => {
  const { data: isSimple } = useUpdateSetting(Settings['minimap-simple'])
  const { data: isXL } = useUpdateSetting(Settings['minimap-xl'])
  const { data: opacityLevel } = useUpdateSetting<number>(Settings['minimap-opacity'])
  const res = useTransformRes({ returnInput: false })

  return (
    <Image
      id='minimap-blocker'
      unoptimized
      priority
      alt='minimap blocker'
      width={
        isXL
          ? res({
              w: 280,
            })
          : res({
              w: 244,
            })
      }
      height={
        isXL
          ? res({
              h: 280,
            })
          : res({
              h: 244,
            })
      }
      src={`/images/overlay/minimap/738-${isSimple ? 'Simple' : 'Complex'}-${
        isXL ? 'X' : ''
      }Large-AntiStreamSnipeMap.png`}
      style={{
        opacity: opacityLevel ?? 0.25,
      }}
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
      key='minimap-blocker'
      {...motionProps}
      style={{
        ...minimapPosition,
        left: minimapPosition.left ?? undefined,
        right: minimapPosition.right ?? undefined,
      }}
      className='absolute'
    >
      {status && original?.beta_tester ? (
        <Minimap block={block} />
      ) : (
        <OriginalMinimapBlocker block={block} />
      )}
    </motion.div>
  )
}
