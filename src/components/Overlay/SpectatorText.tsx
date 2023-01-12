import { motion } from 'framer-motion'
import { Card } from '@/components/Card'

export const SpectatorText = (props) => {
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
        bottom: props.isXL
          ? props.transformRes({
              height: 300,
            })
          : props.transformRes({
              height: 260,
            }),
      }}
      exit={{
        bottom: 0,
      }}
      className="absolute"
      style={{
        bottom: props.isXL
          ? props.transformRes({
              height: 300,
            })
          : props.transformRes({
              height: 260,
            }),
        left: 0,
      }}
    >
      <Card
        style={{
          fontSize: props.transformRes({
            width: 18,
          }),
        }}
      >
        {props.block?.matchId
          ? `Spectating match ${props.block.matchId}`
          : 'Spectating a match'}
      </Card>
    </motion.div>
  )
}
