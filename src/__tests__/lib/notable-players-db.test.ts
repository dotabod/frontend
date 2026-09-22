import { describe, expect, it, vi } from 'vitest'

import { createRuntimeNotablePlayersDatabase } from '@/lib/notable-players-db'
import type { NotablePlayersDatabase } from '@/lib/notable-players-db'

const createDatabaseMock = () =>
  ({
    create: vi.fn<NotablePlayersDatabase['create']>(),
    delete: vi.fn<NotablePlayersDatabase['delete']>(),
    findByAccountId: vi.fn<NotablePlayersDatabase['findByAccountId']>(),
    findOwnership: vi.fn<NotablePlayersDatabase['findOwnership']>(),
    list: vi.fn<NotablePlayersDatabase['list']>(),
    update: vi.fn<NotablePlayersDatabase['update']>(),
  }) satisfies NotablePlayersDatabase

describe('notable players runtime database', () => {
  it('uses the MongoDB implementation on Cloudflare', async () => {
    const cloudflare = createDatabaseMock()
    const node = createDatabaseMock()
    cloudflare.list.mockResolvedValue([])
    const database = createRuntimeNotablePlayersDatabase({
      cloudflare,
      isCloudflareRuntime: () => true,
      node,
    })

    await expect(database.list('32474777')).resolves.toStrictEqual([])
    expect(cloudflare.list).toHaveBeenCalledWith('32474777')
    expect(node.list).not.toHaveBeenCalled()
  })

  it('keeps the Prisma implementation for Node runtimes', async () => {
    const cloudflare = createDatabaseMock()
    const node = createDatabaseMock()
    node.delete.mockResolvedValue()
    const database = createRuntimeNotablePlayersDatabase({
      cloudflare,
      isCloudflareRuntime: () => false,
      node,
    })

    await expect(database.delete('player-id')).resolves.toBeUndefined()
    expect(node.delete).toHaveBeenCalledWith('player-id')
    expect(cloudflare.delete).not.toHaveBeenCalled()
  })
})
