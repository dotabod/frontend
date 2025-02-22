import type { SubscriptionTier } from '@/utils/subscription'
import { Tag } from 'antd'
import { CrownIcon } from 'lucide-react'
export const TierBadge: React.FC<{
  requiredTier?: SubscriptionTier | null
}> = ({ requiredTier }) =>
  requiredTier &&
  requiredTier !== 'free' && (
    <Tag color={requiredTier === 'starter' ? 'cyan' : 'gold'}>
      <div className="flex items-center gap-2 p-1">
        <CrownIcon className="h-4 w-4" />
        <span className="first-letter:uppercase">{requiredTier}</span>
      </div>
    </Tag>
  )
