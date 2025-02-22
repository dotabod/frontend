import { useFeatureAccess } from '@/hooks/useSubscription'
import type { FeatureTier, GenericFeature } from '@/utils/subscription'

export function RestrictFeature({
  feature,
  children,
}: { feature: FeatureTier | GenericFeature; children: React.ReactNode }) {
  const { hasAccess } = useFeatureAccess(feature)
  if (!hasAccess) return null
  return children
}
