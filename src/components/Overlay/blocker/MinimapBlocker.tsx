import { motion } from 'framer-motion'
import Image from 'next/image'
import { transition } from '@/pages/overlay/[userId]'

export const MinimapBlocker = (props) => {
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
      style={props.minimapPosition}
      className="absolute"
    >
      <Image
        priority
        alt="minimap blocker"
        width={
          props.isXL
            ? props.transformRes({
                width: 280,
              })
            : props.transformRes({
                width: 240,
              })
        }
        height={
          props.isXL
            ? props.transformRes({
                height: 280,
              })
            : props.transformRes({
                height: 240,
              })
        }
        src={`/images/overlay/minimap/731-${
          props.isSimple ? 'Simple' : 'Complex'
        }-${props.isXL ? 'X' : ''}Large-AntiStreamSnipeMap.png`}
      />
    </motion.div>
  )
}
