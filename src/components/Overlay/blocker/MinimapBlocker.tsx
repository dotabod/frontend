import { motion } from 'framer-motion'
import Image from 'next/image'
import { transition } from '@/ui/utils'
import { Settings } from '@/lib/defaultSettings'
import { useUpdateSetting } from '@/lib/hooks/useUpdateSetting'
import { useTransformRes } from '@/lib/hooks/useTransformRes'
import { useOverlayPositions } from '@/lib/hooks/useOverlayPositions'

export const MinimapBlocker = ({ block }) => {
  const res = useTransformRes()
  const { data: isEnabled } = useUpdateSetting(Settings['minimap-blocker'])
  const { data: isSimple } = useUpdateSetting(Settings['minimap-simple'])
  const { data: isXL } = useUpdateSetting(Settings['minimap-xl'])
  const { minimapPosition } = useOverlayPositions()

  const shouldBlockMap = isEnabled && block.type === 'playing'

  if (!shouldBlockMap) return null

  return (
    <motion.div
      key="minimap-blocker"
      initial={{
        scale: 0,
      }}
      transition={transition}
      animate={{
        scale: 1,
      }}
      exit={{
        scale: 0,
      }}
      style={minimapPosition}
      className="absolute"
    >
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
        src={`/images/overlay/minimap/731-${isSimple ? 'Simple' : 'Complex'}-${
          isXL ? 'X' : ''
        }Large-AntiStreamSnipeMap.png`}
      />
    </motion.div>
  )
}
