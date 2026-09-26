import { Prisma } from '@prisma/client'
import { describe, expect, it } from 'vitest'

import { manualSettingUpdate } from '@/lib/manual-setting-update'

describe(manualSettingUpdate, () => {
  // Prod 2026-09-26: 893 enabled bot toggles still carried an old reason, which a later
  // disable showed again.
  it('clears the stored disable reason when the streamer flips the bot toggle', () => {
    expect(manualSettingUpdate('commandDisable', true)).toMatchObject({
      autoDisabledAt: null,
      autoDisabledBy: null,
      disableMetadata: Prisma.DbNull,
      disableReason: null,
      value: true,
    })
  })

  it('writes only the value for other settings', () => {
    expect(Object.keys(manualSettingUpdate('aegis', true)).toSorted()).toStrictEqual([
      'updatedAt',
      'value',
    ])
  })
})
