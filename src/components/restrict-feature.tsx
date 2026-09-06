import { useFeatureAccess } from '@/hooks/use-subscription'
import type { FeatureTier, GenericFeature } from '@/utils/subscription'

export const RestrictFeature = ({
  feature,
  children,
}: {
  feature: FeatureTier | GenericFeature
  children: React.ReactNode
}) => {
  const { hasAccess } = useFeatureAccess(feature)
  if (!hasAccess) {
    return null
  }
  return children
}
