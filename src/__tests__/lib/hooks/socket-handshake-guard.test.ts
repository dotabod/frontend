import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  HANDSHAKE_TIMEOUT_MS,
  RETRY_BASE_MS,
  createHandshakeGuard,
  getRetryDelay,
} from '@/lib/hooks/socket-handshake-guard'

const fullDelay = () => 1
const halfDelay = () => 0

const createFakeSocket = () => ({
  connect: vi.fn<() => void>(),
  disconnect: vi.fn<() => void>(),
})

const failHandshake = (guard: ReturnType<typeof createHandshakeGuard>) => {
  guard.opened()
  vi.advanceTimersByTime(HANDSHAKE_TIMEOUT_MS)
}

describe(getRetryDelay, () => {
  it('doubles from 30s up to a five minute cap', () => {
    const delays = [1, 2, 3, 4, 5, 6, 50].map((failures) => getRetryDelay(failures, fullDelay))

    expect(delays).toStrictEqual([30_000, 60_000, 120_000, 240_000, 300_000, 300_000, 300_000])
  })

  it('spreads each delay between half of its ceiling and all of it', () => {
    expect(getRetryDelay(1, halfDelay)).toBe(15_000)
    expect(getRetryDelay(5, halfDelay)).toBe(150_000)
  })
})

describe(createHandshakeGuard, () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('leaves a handshake that completes in time alone', () => {
    const socket = createFakeSocket()
    const guard = createHandshakeGuard(socket, fullDelay)

    guard.opened()
    guard.connected()
    vi.advanceTimersByTime(HANDSHAKE_TIMEOUT_MS * 2)

    expect(socket.disconnect).not.toHaveBeenCalled()
    expect(guard.isBackingOff()).toBe(false)
  })

  it('drops a handshake the server never answers and redials after the first backoff', () => {
    const socket = createFakeSocket()
    const guard = createHandshakeGuard(socket, fullDelay)

    guard.opened()
    vi.advanceTimersByTime(HANDSHAKE_TIMEOUT_MS - 1)
    expect(socket.disconnect).not.toHaveBeenCalled()

    vi.advanceTimersByTime(1)
    expect(socket.disconnect).toHaveBeenCalledOnce()
    expect(guard.isBackingOff()).toBe(true)

    vi.advanceTimersByTime(RETRY_BASE_MS - 1)
    expect(socket.connect).not.toHaveBeenCalled()

    vi.advanceTimersByTime(1)
    expect(socket.connect).toHaveBeenCalledOnce()
    expect(guard.isBackingOff()).toBe(false)
  })

  it('waits longer after each consecutive failure and starts over once connected', () => {
    const socket = createFakeSocket()
    const guard = createHandshakeGuard(socket, fullDelay)

    failHandshake(guard)
    vi.advanceTimersByTime(30_000)
    expect(socket.connect).toHaveBeenCalledTimes(1)

    failHandshake(guard)
    vi.advanceTimersByTime(59_999)
    expect(socket.connect).toHaveBeenCalledTimes(1)
    vi.advanceTimersByTime(1)
    expect(socket.connect).toHaveBeenCalledTimes(2)

    guard.opened()
    guard.connected()

    failHandshake(guard)
    vi.advanceTimersByTime(30_000)
    expect(socket.connect).toHaveBeenCalledTimes(3)
  })

  it('does not time out a transport that closed before the server answered', () => {
    const socket = createFakeSocket()
    const guard = createHandshakeGuard(socket, fullDelay)

    guard.opened()
    guard.closed()
    vi.advanceTimersByTime(HANDSHAKE_TIMEOUT_MS * 2)

    expect(socket.disconnect).not.toHaveBeenCalled()
  })

  it('cancels a pending handshake timeout and a pending redial when disposed', () => {
    const socket = createFakeSocket()
    const guard = createHandshakeGuard(socket, fullDelay)

    guard.opened()
    guard.dispose()
    vi.advanceTimersByTime(HANDSHAKE_TIMEOUT_MS * 2)
    expect(socket.disconnect).not.toHaveBeenCalled()

    failHandshake(guard)
    guard.dispose()
    vi.advanceTimersByTime(RETRY_BASE_MS * 2)
    expect(socket.connect).not.toHaveBeenCalled()
  })
})
