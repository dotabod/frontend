import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { startSevenTvPolling } from '../seven-tv-polling'

const flushPromises = async () => {
  await Promise.resolve()
  await Promise.resolve()
}

describe(startSevenTvPolling, () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('waits for each request to settle before scheduling the next one', async () => {
    let resolveRequest: ((shouldContinue: boolean) => void) | undefined
    const poll = vi.fn(
      () =>
        new Promise<boolean>((resolve) => {
          resolveRequest = resolve
        }),
    )

    const stop = startSevenTvPolling({ poll })
    expect(poll).toHaveBeenCalledTimes(1)

    await vi.advanceTimersByTimeAsync(30_000)
    expect(poll).toHaveBeenCalledTimes(1)

    resolveRequest?.(true)
    await flushPromises()
    await vi.advanceTimersByTimeAsync(4_999)
    expect(poll).toHaveBeenCalledTimes(1)

    await vi.advanceTimersByTimeAsync(1)
    expect(poll).toHaveBeenCalledTimes(2)
    stop()
  })

  it('stops polling when setup is complete', async () => {
    const poll = vi.fn().mockResolvedValue(false)
    const stop = startSevenTvPolling({ poll })

    await flushPromises()
    await vi.advanceTimersByTimeAsync(60_000)

    expect(poll).toHaveBeenCalledTimes(1)
    stop()
  })

  it('pauses while hidden and polls immediately when the page becomes visible', async () => {
    let visibilityState: DocumentVisibilityState = 'hidden'
    const listeners = new Set<() => void>()
    const documentObject = {
      addEventListener: (_type: 'visibilitychange', listener: () => void) => {
        listeners.add(listener)
      },
      get visibilityState() {
        return visibilityState
      },
      removeEventListener: (_type: 'visibilitychange', listener: () => void) => {
        listeners.delete(listener)
      },
    }
    const poll = vi.fn().mockResolvedValue(true)
    const stop = startSevenTvPolling({ documentObject, poll })

    await vi.advanceTimersByTimeAsync(30_000)
    expect(poll).not.toHaveBeenCalled()

    visibilityState = 'visible'
    for (const listener of listeners) {
      listener()
    }
    await flushPromises()

    expect(poll).toHaveBeenCalledTimes(1)
    stop()
  })

  it('aborts a hidden-page request before restarting without overlap', async () => {
    let visibilityState: DocumentVisibilityState = 'visible'
    const listeners = new Set<() => void>()
    const documentObject = {
      addEventListener: (_type: 'visibilitychange', listener: () => void) => {
        listeners.add(listener)
      },
      get visibilityState() {
        return visibilityState
      },
      removeEventListener: (_type: 'visibilitychange', listener: () => void) => {
        listeners.delete(listener)
      },
    }
    let activeRequests = 0
    let maximumActiveRequests = 0
    const poll = vi.fn(
      (signal: AbortSignal) =>
        new Promise<boolean>((_resolve, reject) => {
          activeRequests += 1
          maximumActiveRequests = Math.max(maximumActiveRequests, activeRequests)
          signal.addEventListener('abort', () => {
            activeRequests -= 1
            reject(new DOMException('Aborted', 'AbortError'))
          })
        }),
    )
    const stop = startSevenTvPolling({ documentObject, poll })

    visibilityState = 'hidden'
    for (const listener of listeners) listener()
    visibilityState = 'visible'
    for (const listener of listeners) listener()
    await flushPromises()

    expect(poll).toHaveBeenCalledTimes(2)
    expect(maximumActiveRequests).toBe(1)
    stop()
  })

  it('aborts and cannot restart after cleanup', async () => {
    const listeners = new Set<() => void>()
    let visibilityListener: (() => void) | undefined
    const documentObject = {
      addEventListener: (_type: 'visibilitychange', listener: () => void) => {
        visibilityListener = listener
        listeners.add(listener)
      },
      visibilityState: 'visible' as DocumentVisibilityState,
      removeEventListener: (_type: 'visibilitychange', listener: () => void) => {
        listeners.delete(listener)
      },
    }
    let requestSignal: AbortSignal | undefined
    let resolveRequest: ((shouldContinue: boolean) => void) | undefined
    const poll = vi.fn(
      (signal: AbortSignal) =>
        new Promise<boolean>((resolve) => {
          requestSignal = signal
          resolveRequest = resolve
        }),
    )
    const stop = startSevenTvPolling({ documentObject, poll })

    stop()

    expect(requestSignal?.aborted).toBe(true)
    expect(listeners.size).toBe(0)

    resolveRequest?.(true)
    await flushPromises()
    visibilityListener?.()
    await vi.advanceTimersByTimeAsync(60_000)

    expect(poll).toHaveBeenCalledTimes(1)
  })

  it('backs off repeated failures', async () => {
    const onError = vi.fn()
    const poll = vi.fn().mockRejectedValue(new Error('7TV unavailable'))
    const stop = startSevenTvPolling({ onError, poll })

    await flushPromises()
    expect(poll).toHaveBeenCalledTimes(1)

    await vi.advanceTimersByTimeAsync(9_999)
    expect(poll).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(1)
    expect(poll).toHaveBeenCalledTimes(2)

    await vi.advanceTimersByTimeAsync(19_999)
    expect(poll).toHaveBeenCalledTimes(2)
    await vi.advanceTimersByTimeAsync(1)
    expect(poll).toHaveBeenCalledTimes(3)
    expect(onError).toHaveBeenCalledTimes(3)
    stop()
  })
})
