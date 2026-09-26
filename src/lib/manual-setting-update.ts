import { Prisma } from '@prisma/client'

import { Settings } from '@/lib/default-settings'

// Flipping the bot toggle by hand overrides whatever disabled it, so drop the system's
// reason with it. Left behind, a later disable shows the stale reason, and a stale
// TOKEN_REVOKED lets twitch-events re-enable the bot on the streamer's next sign-in.
export const manualSettingUpdate = function manualSettingUpdate(
  settingKey: string,
  value: Prisma.InputJsonValue | typeof Prisma.JsonNull,
) {
  const update = { updatedAt: new Date(), value }
  if (settingKey !== Settings.commandDisable) {
    return update
  }

  return {
    ...update,
    autoDisabledAt: null,
    autoDisabledBy: null,
    disableMetadata: Prisma.DbNull,
    disableReason: null,
  }
}
