import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  isDroppedConnectionError,
  retryReadOnDroppedConnection,
} from '@/lib/dropped-connection-retry'

// The forms these reach app code in: the Prisma pg adapter's DriverAdapterError carrying
// Hyperdrive's message, and pg's own error when the socket closes.
const hyperdriveSevered = () =>
  Object.assign(new Error('Egress connection severed outside of Hyperdrive'), {
    name: 'DriverAdapterError',
  })
const socketClosed = () => new Error('Connection terminated unexpectedly')

describe(isDroppedConnectionError, () => {
  it.each([
    hyperdriveSevered(),
    socketClosed(),
    new Error('Connection to the origin database was lost.'),
    new Error('Query failed', { cause: socketClosed() }),
  ])('recognizes a dropped connection: $message', (thrown) => {
    expect(isDroppedConnectionError(thrown)).toBeTruthy()
  })

  it.each([
    new Error('Unique constraint failed on the fields: (`name`)'),
    'Connection terminated unexpectedly',
  ])('ignores anything else: %s', (thrown) => {
    expect(isDroppedConnectionError(thrown)).toBeFalsy()
  })
})

describe(retryReadOnDroppedConnection, () => {
  beforeEach(() => {
    vi.spyOn(console, 'warn').mockReturnValue()
  })

  it('runs a read again after the connection drops', async () => {
    const run = vi
      .fn<() => Promise<string>>()
      .mockRejectedValueOnce(hyperdriveSevered())
      .mockResolvedValueOnce('row')

    await expect(retryReadOnDroppedConnection('findUnique', run)).resolves.toBe('row')
    expect(run).toHaveBeenCalledTimes(2)
  })

  it('retries a read only once', async () => {
    const run = vi.fn<() => Promise<string>>().mockRejectedValue(socketClosed())

    await expect(retryReadOnDroppedConnection('findMany', run)).rejects.toThrow(
      'Connection terminated unexpectedly',
    )
    expect(run).toHaveBeenCalledTimes(2)
  })

  // The first attempt may already have committed.
  it('does not retry a write', async () => {
    const run = vi.fn<() => Promise<string>>().mockRejectedValue(hyperdriveSevered())

    await expect(retryReadOnDroppedConnection('update', run)).rejects.toThrow(
      'Egress connection severed outside of Hyperdrive',
    )
    expect(run).toHaveBeenCalledOnce()
  })

  it('does not retry a read that failed for another reason', async () => {
    const run = vi.fn<() => Promise<string>>().mockRejectedValue(new Error('Invalid argument'))

    await expect(retryReadOnDroppedConnection('findFirst', run)).rejects.toThrow('Invalid argument')
    expect(run).toHaveBeenCalledOnce()
  })
})
