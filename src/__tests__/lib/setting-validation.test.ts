import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { defaultSettings } from '@/lib/default-settings'
import { dynamicSettingSchema, settingKeySchema } from '@/lib/validations/setting'
import { getRequiredTier } from '@/utils/subscription'

// customMmr has a default but no dashboard control that saves it.
const keysWithoutDashboardControl = new Set(['customMmr'])

describe('setting key validation', () => {
  it('accepts every default setting the dashboard can save', () => {
    const rejected = Object.keys(defaultSettings).filter(
      (key) => !keysWithoutDashboardControl.has(key) && !settingKeySchema.safeParse(key).success,
    )

    expect(rejected).toStrictEqual([])
  })
})

describe('discardZeroBets setting', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-11-16T00:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('defaults to off and requires Pro', () => {
    expect(defaultSettings.discardZeroBets).toBeFalsy()
    expect(getRequiredTier('discardZeroBets')).toBe('PRO')
  })

  it.each([true, false])('accepts %s for an active Pro subscription', (value) => {
    const schema = dynamicSettingSchema('discardZeroBets', {
      isGift: false,
      status: 'ACTIVE',
      tier: 'PRO',
    })

    expect(schema.parse({ key: 'discardZeroBets', value })).toStrictEqual({
      key: 'discardZeroBets',
      value,
    })
    expect(schema.safeParse({ key: 'discardZeroBets', value: String(value) }).success).toBeFalsy()
  })

  it.each([
    null,
    { isGift: false, status: 'ACTIVE' as const, tier: 'FREE' as const },
    { isGift: false, status: 'CANCELED' as const, tier: 'PRO' as const },
  ])('rejects writes without an active Pro subscription: %o', (subscription) => {
    const schema = dynamicSettingSchema('discardZeroBets', subscription)

    expect(schema.safeParse({ key: 'discardZeroBets', value: true }).success).toBeFalsy()
  })
})
