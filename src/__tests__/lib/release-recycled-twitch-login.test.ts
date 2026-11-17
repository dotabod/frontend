import { describe, expect, it, vi } from 'vitest'

import { releaseRecycledTwitchLogin } from '@/lib/release-recycled-twitch-login'

type Store = NonNullable<Parameters<typeof releaseRecycledTwitchLogin>[1]>
type Holder = Awaited<ReturnType<Store['findHolders']>>[number]

const newOwner = { displayName: 'Arteezy', id: '200', name: 'arteezy' }

const createStore = (holders: Holder[]) => {
  const findHolders = vi.fn<Store['findHolders']>().mockResolvedValue(holders)
  const rename = vi.fn<Store['rename']>().mockResolvedValue()
  return { findHolders, rename, store: { findHolders, rename } }
}

describe(releaseRecycledTwitchLogin, () => {
  // Support 2026-11-17: a new Twitch account took a deleted account's login, and the deleted
  // account's 2023 row blocked every sign-in with "Unique constraint failed on the fields: (`name`)".
  it('frees the login and display name a deleted Twitch account still holds', async () => {
    const { rename, store } = createStore([
      { displayName: 'Arteezy', id: 'user_old', name: 'arteezy', twitchId: '100' },
    ])

    await releaseRecycledTwitchLogin(newOwner, store)

    expect(rename).toHaveBeenCalledExactlyOnceWith('user_old', {
      displayName: 'Arteezy-released-user_old',
      name: 'arteezy-released-user_old',
    })
  })

  it('leaves the row of the account that is signing in alone', async () => {
    const { rename, store } = createStore([
      { displayName: 'Arteezy', id: 'user_own', name: 'arteezy', twitchId: '200' },
    ])

    await releaseRecycledTwitchLogin(newOwner, store)

    expect(rename).not.toHaveBeenCalled()
  })

  it('renames only the column each stale row holds', async () => {
    const { rename, store } = createStore([
      { displayName: 'OldName', id: 'user_a', name: 'arteezy', twitchId: '100' },
      { displayName: 'Arteezy', id: 'user_b', name: 'someoneelse', twitchId: null },
    ])

    await releaseRecycledTwitchLogin(newOwner, store)

    expect(rename).toHaveBeenCalledWith('user_a', { name: 'arteezy-released-user_a' })
    expect(rename).toHaveBeenCalledWith('user_b', { displayName: 'Arteezy-released-user_b' })
  })

  it('skips the lookup when the profile has no Twitch ID to compare against', async () => {
    const { findHolders, store } = createStore([])

    await releaseRecycledTwitchLogin({ ...newOwner, id: '' }, store)

    expect(findHolders).not.toHaveBeenCalled()
  })
})
