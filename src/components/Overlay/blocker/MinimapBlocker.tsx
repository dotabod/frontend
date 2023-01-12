import { motion } from 'framer-motion'
import Image from 'next/image'
import { transition } from '@/ui/utils'

export const MinimapBlocker = ({
  isSimple,
  isXL,
  minimapPosition,
  transformRes,
}) => {
  return (
    <motion.div
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
        priority
        alt="minimap blocker"
        width={
          isXL
            ? transformRes({
                width: 280,
              })
            : transformRes({
                width: 240,
              })
        }
        height={
          isXL
            ? transformRes({
                height: 280,
              })
            : transformRes({
                height: 240,
              })
        }
        src={`/images/overlay/minimap/731-${isSimple ? 'Simple' : 'Complex'}-${
          isXL ? 'X' : ''
        }Large-AntiStreamSnipeMap.png`}
      />
    </motion.div>
  )
}
