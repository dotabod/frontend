import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/hooks/use-update-setting', () => ({
  useUpdateSetting: vi.fn(() => ({
    data: true,
    isSaving: false,
    tierAccess: { hasAccess: true, requiredTier: undefined },
    updateSetting: vi.fn(),
  })),
}))
vi.mock('@/components/Dashboard/Features/tier-badge', () => ({
  TierBadge: () => null,
}))

import { TierSwitch } from '@/components/Dashboard/Features/tier-switch'

describe(TierSwitch, () => {
  it('uses its visible string label as the switch accessible name', () => {
    render(<TierSwitch settingKey='commandToday' label='Use !today hero stats' />)

    expect(screen.getByRole('switch', { name: 'Use !today hero stats' })).toBeChecked()
  })
})
