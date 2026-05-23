import type {} from 'react'

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
