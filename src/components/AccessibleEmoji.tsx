import type { ReactNode } from 'react'

interface AccessibleEmojiProps {
  emoji: string
  label: string
  className?: string
}

/**
 * Accessible emoji component that includes aria-label for screen readers
 */
export const AccessibleEmoji = ({ emoji, label, className }: AccessibleEmojiProps) => (
  <span className={className} aria-label={label} role='img'>
    {emoji}
  </span>
)

interface AccessibleStatusProps {
  status: 'success' | 'error' | 'pending'
  text: ReactNode
  className?: string
}

/**
 * Status indicator with accessible emoji and text
 */
export const AccessibleStatus = ({ status, text, className }: AccessibleStatusProps) => {
  const statusConfig = {
    success: { emoji: '✅', label: 'success', colorClass: 'text-green-500' },
    error: { emoji: '❌', label: 'error', colorClass: 'text-red-500' },
    pending: { emoji: '⏳', label: 'pending', colorClass: 'text-yellow-500' },
  }

  const { emoji, label, colorClass } = statusConfig[status]

  return (
    <div className={className}>
      <AccessibleEmoji emoji={emoji} label={label} className={colorClass} />
      <span className='ml-1'>{text}</span>
    </div>
  )
}
