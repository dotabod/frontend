import { motion } from 'framer-motion'
import { Card } from '@/components/Card'

export const SpectatorText = ({ block, isXL, transformRes }) => {
  return (
    <motion.div
      initial={{
        bottom: 0,
      }}
      transition={{
        type: 'spring',
        stiffness: 260,
        damping: 20,
      }}
      animate={{
        bottom: isXL
          ? transformRes({
              height: 300,
            })
          : transformRes({
              height: 260,
            }),
      }}
      exit={{
        bottom: 0,
      }}
      className="absolute"
      style={{
        bottom: isXL
          ? transformRes({
              height: 300,
            })
          : transformRes({
              height: 260,
            }),
        left: 0,
      }}
    >
      <Card
        style={{
          fontSize: transformRes({
            width: 18,
          }),
        }}
      >
        {block?.matchId
          ? `Spectating match ${block.matchId}`
          : 'Spectating a match'}
      </Card>
    </motion.div>
  )
}
