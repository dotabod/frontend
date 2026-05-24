import type { PrismaClient } from '@prisma/client'

// Reconciles users.name + users.displayName against /helix/users on every
// sign-in. Solves the edge case where a user changed their Twitch *login*
// (e.g. techleed → jamesleed) without changing their *display name* — the
// jwt() callback's rename-detection check compares `preferred_username`
// (which IS the display name), so it can't see login-only changes. Without
// this safety net the DB keeps the stale login and dotabod tries to join
// the wrong chat channel.
//
// Cost: one /helix/users call per fresh JWT (≈ every 3 days per active user
// at the current `session.maxAge`). Negligible.

interface ReconcileArgs {
  prisma: Pick<PrismaClient, 'user'>
  userId: string
  accessToken: string
}

interface HelixUser {
  id: string
  login: string
  display_name: string
}

async function fetchHelix(accessToken: string): Promise<HelixUser | null> {
  try {
    const res = await fetch('https://api.twitch.tv/helix/users', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Client-Id': process.env.TWITCH_CLIENT_ID ?? '',
      },
    })
    if (!res.ok) return null
    const body = (await res.json()) as { data?: HelixUser[] }
    return body.data?.[0] ?? null
  } catch {
    return null
  }
}

export type ReconcileResult = 'updated' | 'no-change' | 'helix-unavailable'

export async function reconcileTwitchProfile({
  prisma,
  userId,
  accessToken,
}: ReconcileArgs): Promise<ReconcileResult> {
  const helix = await fetchHelix(accessToken)
  if (!helix) return 'helix-unavailable'

  const current = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, displayName: true },
  })
  if (!current) return 'no-change'

  if (current.name === helix.login && current.displayName === helix.display_name) {
    return 'no-change'
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      name: helix.login,
      displayName: helix.display_name,
      updatedAt: new Date(),
    },
  })
  return 'updated'
}
