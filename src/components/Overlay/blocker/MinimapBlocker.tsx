import { motion } from 'framer-motion'
import { motionProps } from '@/ui/utils'
import { Settings } from '@/lib/defaultSettings'
import { useUpdate, useUpdateSetting } from '@/lib/hooks/useUpdateSetting'
import { useTransformRes } from '@/lib/hooks/useTransformRes'
import { useOverlayPositions } from '@/lib/hooks/useOverlayPositions'
import Minimap from '../minimap'
import { blockType } from '@/lib/devConsts'
import Image from 'next/image'
import { selectStatus } from '@/lib/redux/store'
import { useSelector } from 'react-redux'

export const MinimapBlocker = ({ block }: { block: blockType }) => {
  const res = useTransformRes()
  const { data: isEnabled } = useUpdateSetting(Settings['minimap-blocker'])
  const { data: isSimple } = useUpdateSetting(Settings['minimap-simple'])
  const { data: isXL } = useUpdateSetting(Settings['minimap-xl'])
  const { minimapPosition } = useOverlayPositions()
  const { data } = useUpdate({ path: `/api/settings` })
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
      {status && data?.beta_tester ? (
        <Minimap block={block} />
      ) : (
        <Image
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
          src={`/images/overlay/minimap/731-${
            isSimple ? 'Simple' : 'Complex'
          }-${isXL ? 'X' : ''}Large-AntiStreamSnipeMap.png`}
        />
      )}
    </motion.div>
  )
}
