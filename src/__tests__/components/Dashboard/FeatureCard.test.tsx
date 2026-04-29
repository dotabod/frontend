import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { Card } from '@/ui/card'

const useFeatureAccessMock = vi.fn()

vi.mock('@/hooks/useSubscription', () => ({
  useFeatureAccess: (feature?: string) => useFeatureAccessMock(feature),
}))

vi.mock('@/components/Dashboard/Features/TierBadge', () => ({
  TierBadge: ({ requiredTier }: { requiredTier?: string | null }) => (
    <div data-testid='tier-badge'>{requiredTier}</div>
  ),
}))

vi.mock('@/components/Dashboard/Features/LockedFeatureOverlay', () => ({
  LockedFeatureOverlay: ({ requiredTier }: { requiredTier?: string | null }) => (
    <div data-testid='locked-feature-overlay'>{requiredTier}</div>
  ),
}))

describe('Feature card locked states', () => {
  it('renders a single tier badge for locked cards with titles and clips the overlay', () => {
    useFeatureAccessMock.mockReturnValue({
      hasAccess: false,
      requiredTier: 'PRO',
    })

    render(
      <Card
        title='Win probability'
        feature={'winProbabilityOverlay' as never}
        data-testid='locked-card'
      >
        <div>Body</div>
      </Card>,
    )

    const card = screen.getByTestId('locked-card')

    expect(screen.getAllByTestId('tier-badge')).toHaveLength(1)
    expect(card).toHaveClass('overflow-hidden')

    fireEvent.mouseEnter(card)

    expect(screen.getByTestId('locked-feature-overlay')).toBeInTheDocument()
  })
})
