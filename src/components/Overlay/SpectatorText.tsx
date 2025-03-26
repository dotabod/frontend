import { Card } from '@/components/Card'
import { Settings } from '@/lib/defaultSettings'
import type { blockType } from '@/lib/devConsts'
import { useTransformRes } from '@/lib/hooks/useTransformRes'
import { useUpdateSetting } from '@/lib/hooks/useUpdateSetting'
import { motionProps } from '@/ui/utils'
import { motion } from 'framer-motion'

interface Position {
  bottom: number
  left?: number | null
  right?: number | null
}

export const SpectatorText = ({ block }: { block: blockType }) => {
  const res = useTransformRes({ returnInput: false })
  const { data: isXL } = useUpdateSetting(Settings['minimap-xl'])
  const { data: isRight } = useUpdateSetting(Settings.minimapRight)

  if (block?.type !== 'spectator') return null

  const styles: Position = {
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
      key='spectator-text'
      {...motionProps}
      className='absolute'
      id='spectator-text'
      style={{
        bottom: styles.bottom,
        left: styles.left ?? undefined,
        right: styles.right ?? undefined,
      }}
    >
      <Card
        style={{
          fontSize: res({
            w: 18,
          }),
        }}
      >
        {block?.matchId ? `Spectating match ${block.matchId}` : 'Spectating a match'}
      </Card>
    </motion.div>
  )
}
