import { AnimatePresence, motion } from 'framer-motion'
import { Card } from '@/components/Card'
import { Settings } from '@/lib/defaultSettings'
import type { blockType } from '@/lib/devConsts'
import type { ChatMessage } from '@/lib/hooks/useSocket'
import { useTransformRes } from '@/lib/hooks/useTransformRes'
import { useUpdateSetting } from '@/lib/hooks/useUpdateSetting'
import { motionProps } from '@/ui/utils'

interface Position {
  bottom: number
  left?: number | null
  right?: number | null
}

export const ChatMessagesOverlay = ({
  block,
  chatMessages,
}: {
  block: blockType
  chatMessages: ChatMessage[]
}) => {
  const res = useTransformRes({ returnInput: false })
  const { data: isRight } = useUpdateSetting(Settings.minimapRight)
  const { data: isEnabled } = useUpdateSetting(Settings.autoTranslate)

  if (!block.type || chatMessages.length === 0 || !isEnabled) return null

  const styles: Position = {
    bottom: res({
      h: 120,
    }),
    left: undefined,
    right: 0,
  }

  if (isRight) {
    styles.right = undefined
    styles.left = 0
  }

  return (
    <motion.div
      key='chat-messages-overlay'
      {...motionProps}
      className='absolute z-10'
      id='chat-messages-overlay'
      style={{
        bottom: styles.bottom,
        left: styles.left ?? undefined,
        right: styles.right ?? undefined,
      }}
    >
      <Card
        style={{
          fontSize: res({
            w: 16,
          }),
          maxWidth: res({
            w: 300,
          }),
        }}
        id='auto-translate-card'
      >
        <div className='space-y-2'>
          <AnimatePresence>
            {chatMessages.map((msg, index) => (
              <motion.div
                key={`${msg.timestamp}-${index}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className='text-white font-medium'
              >
                {msg.message}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </Card>
    </motion.div>
  )
}
