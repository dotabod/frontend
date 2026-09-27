import { describe, expect, it } from 'vitest'

import { defaultSettings } from '@/lib/default-settings'
import { settingKeySchema } from '@/lib/validations/setting'

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
