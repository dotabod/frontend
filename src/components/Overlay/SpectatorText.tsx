import { motion } from 'framer-motion'
import { Card } from '@/components/Card'
import { useUpdateSetting } from '@/lib/hooks/useUpdateSetting'
import { Settings } from '@/lib/defaultSettings'
import { useTransformRes } from '@/lib/hooks/useTransformRes'
import { motionProps } from '@/ui/utils'
import { blockType } from '@/lib/devConsts'

export const SpectatorText = ({ block }: { block: blockType }) => {
  const res = useTransformRes()
  const { data: isXL } = useUpdateSetting(Settings['minimap-xl'])
  const { data: isRight } = useUpdateSetting(Settings.minimapRight)

  if (block?.type !== 'spectator') return null

  const styles = {
    bottom: isXL
      ? res({
          h: 300,
        })
      : res({
          h: 260,
        }),
    left: 0,
    right: undefined,
  }

  if (isRight) {
    styles.right = styles.left
    styles.left = null
  }

  return (
    <motion.div
      key="spectator-text"
      {...motionProps}
      className="absolute"
      id="spectator-text"
      style={styles}
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
