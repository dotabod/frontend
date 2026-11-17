// Twitch gives the login of a deleted account to whoever claims it next.
// users.name and users.displayName are unique, so the old account's row keeps
// the value and the new owner's first sign-in fails in prisma.user.create(),
// which the login page shows as the generic OAuthCreateAccount error.
//
// Twitch logins are unique, so any row holding the signing-in account's login
// under a different Twitch ID (or none) is stale. Appending the row id frees
// the value; a Twitch login can't contain "-", so the result never matches a
// real one. If the old account was renamed rather than deleted, the backend's
// UPDATE:users watcher restores its current login from /helix/users.

import { captureMessage } from '@sentry/nextjs'

import prisma from '@/lib/db'
import type { TwitchProfileUser } from '@/lib/twitch-helix-profile'

interface LoginHolder {
  displayName: string | null
  id: string
  name: string
  twitchId: string | null
}

interface ReleaseStore {
  findHolders: (name: string, displayName: string) => Promise<LoginHolder[]>
  rename: (userId: string, names: { displayName?: string; name?: string }) => Promise<void>
}

const prismaStore: ReleaseStore = {
  findHolders: async (name, displayName) => {
    const users = await prisma.user.findMany({
      select: {
        Account: { select: { providerAccountId: true } },
        displayName: true,
        id: true,
        name: true,
      },
      where: { OR: [{ name }, { displayName }] },
    })
    return users.map((user) => ({
      displayName: user.displayName,
      id: user.id,
      name: user.name,
      twitchId: user.Account?.providerAccountId ?? null,
    }))
  },
  rename: async (userId, names) => {
    await prisma.user.update({ data: { ...names, updatedAt: new Date() }, where: { id: userId } })
  },
}

export const releaseRecycledTwitchLogin = async function releaseRecycledTwitchLogin(
  user: Pick<TwitchProfileUser, 'displayName' | 'id' | 'name'>,
  store: ReleaseStore = prismaStore,
): Promise<void> {
  // An empty Twitch ID would make the user's own row look stale, and an empty
  // name is the profile fallback, not a login anyone can hold.
  if (user.id === '' || user.name === '' || user.displayName === '') {
    return
  }

  const holders = await store.findHolders(user.name, user.displayName)
  const stale = holders.filter((holder) => holder.twitchId !== user.id)
  if (stale.length === 0) {
    return
  }

  await Promise.all(
    stale.map(async (holder) => {
      const suffix = `-released-${holder.id}`
      await store.rename(holder.id, {
        displayName:
          holder.displayName === user.displayName ? `${user.displayName}${suffix}` : undefined,
        name: holder.name === user.name ? `${user.name}${suffix}` : undefined,
      })
    }),
  )
  captureMessage('Released a recycled Twitch login', {
    extra: { releasedUserIds: stale.map((holder) => holder.id), twitchId: user.id },
    fingerprint: ['released-recycled-twitch-login'],
    level: 'info',
  })
}
