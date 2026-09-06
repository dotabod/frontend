import { motion } from 'framer-motion'

import { Card } from '@/components/card'
import { Settings } from '@/lib/default-settings'
import type { blockType } from '@/lib/dev-consts'
import { useTransformRes } from '@/lib/hooks/use-transform-res'
import { useUpdateSetting } from '@/lib/hooks/use-update-setting'
import { motionProps } from '@/ui/utils'

interface Position {
  bottom: number
  left?: number | null
  right?: number | null
}

export const SpectatorText = ({ block }: { block: blockType }) => {
  const res = useTransformRes({ returnInput: false })
  const { data: isXL } = useUpdateSetting(Settings['minimap-xl'])
  const { data: isRight } = useUpdateSetting(Settings.minimapRight)

  if (block?.type !== 'spectator') {
    return null
  }

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
