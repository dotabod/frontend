import { motion } from 'framer-motion'
import { Card } from '@/components/Card'
import { useUpdateSetting } from '@/lib/hooks/useUpdateSetting'
import { Settings } from '@/lib/defaultSettings'
import { useTransformRes } from '@/lib/hooks/useTransformRes'

export const SpectatorText = ({ block }) => {
  const res = useTransformRes()
  const { data: isXL } = useUpdateSetting(Settings['minimap-xl'])

  if (block?.type !== 'spectator') return null

  return (
    <motion.div
      key="spectator-text"
      initial={{
        scale: 0,
      }}
      transition={{
        type: 'spring',
        stiffness: 260,
        damping: 20,
      }}
      animate={{
        scale: 1,
      }}
      exit={{
        scale: 0,
      }}
      className="absolute"
      style={{
        bottom: isXL
          ? res({
              h: 300,
            })
          : res({
              h: 260,
            }),
        left: 0,
      }}
    >
      <Card
        style={{
          fontSize: res({
            w: 18,
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
