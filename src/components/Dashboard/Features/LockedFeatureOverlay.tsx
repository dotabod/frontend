import { Button } from 'antd'
import { LockOutlined } from '@ant-design/icons'
import Link from 'next/link'
import type { SubscriptionTier } from '@/utils/subscription'

interface LockedFeatureOverlayProps {
  requiredTier: SubscriptionTier
  message?: string
}

export function LockedFeatureOverlay({
  requiredTier,
  message = `This feature is available on the ${requiredTier} plan`,
}: LockedFeatureOverlayProps) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/1 rounded-lg backdrop-blur-sm z-10">
      <LockOutlined className="text-4xl text-white mb-4" />
      <p className="text-white text-center mb-4">{message}</p>
      <Link href="/dashboard/billing">
        <Button type="primary">Upgrade now</Button>
      </Link>
    </div>
  )
}
