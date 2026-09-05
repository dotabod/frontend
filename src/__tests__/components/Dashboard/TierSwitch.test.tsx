import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/hooks/useUpdateSetting', () => ({
  useUpdateSetting: vi.fn(() => ({
    data: true,
    isSaving: false,
    tierAccess: { hasAccess: true, requiredTier: undefined },
    updateSetting: vi.fn(),
  })),
}))
vi.mock('@/components/Dashboard/Features/TierBadge', () => ({
  TierBadge: () => null,
}))

import { TierSwitch } from '@/components/Dashboard/Features/TierSwitch'

describe('TierSwitch', () => {
  it('uses its visible string label as the switch accessible name', () => {
    render(<TierSwitch settingKey='commandToday' label='Use !today hero stats' />)

    expect(screen.getByRole('switch', { name: 'Use !today hero stats' })).toBeChecked()
  })
})
