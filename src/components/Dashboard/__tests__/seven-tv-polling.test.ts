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
    const poll = vi.fn<(signal: AbortSignal) => Promise<boolean>>(async (_signal) => {
      const request = Promise.withResolvers<boolean>()
      resolveRequest = request.resolve
      const shouldContinue = await request.promise
      return shouldContinue
    })

    const stop = startSevenTvPolling({ poll })
    expect(poll).toHaveBeenCalledOnce()

    await vi.advanceTimersByTimeAsync(30_000)
    expect(poll).toHaveBeenCalledOnce()

    resolveRequest?.(true)
    await flushPromises()
    await vi.advanceTimersByTimeAsync(4999)
    expect(poll).toHaveBeenCalledOnce()

    await vi.advanceTimersByTimeAsync(1)
    expect(poll).toHaveBeenCalledTimes(2)
    stop()
  })

  it('stops polling when setup is complete', async () => {
    const poll = vi.fn<(signal: AbortSignal) => Promise<boolean>>().mockResolvedValue(false)
    const stop = startSevenTvPolling({ poll })

    await flushPromises()
    await vi.advanceTimersByTimeAsync(60_000)

    expect(poll).toHaveBeenCalledOnce()
    stop()
  })

  it('pauses while hidden and polls immediately when the page becomes visible', async () => {
    let visibilityState: DocumentVisibilityState = 'hidden'
    const listeners = new Set<() => void>()
    const documentObject = {
      addEventListener: (_type: 'visibilitychange', listener: () => void) => {
        listeners.add(listener)
      },
      removeEventListener: (_type: 'visibilitychange', listener: () => void) => {
        listeners.delete(listener)
      },
      get visibilityState() {
        return visibilityState
      },
    }
    const poll = vi.fn<(signal: AbortSignal) => Promise<boolean>>().mockResolvedValue(true)
    const stop = startSevenTvPolling({ documentObject, poll })

    await vi.advanceTimersByTimeAsync(30_000)
    expect(poll).not.toHaveBeenCalled()

    visibilityState = 'visible'
    for (const listener of listeners) {
      listener()
    }
    await flushPromises()

    expect(poll).toHaveBeenCalledOnce()
    stop()
  })

  it('aborts a hidden-page request before restarting without overlap', async () => {
    let visibilityState: DocumentVisibilityState = 'visible'
    const listeners = new Set<() => void>()
    const documentObject = {
      addEventListener: (_type: 'visibilitychange', listener: () => void) => {
        listeners.add(listener)
      },
      removeEventListener: (_type: 'visibilitychange', listener: () => void) => {
        listeners.delete(listener)
      },
      get visibilityState() {
        return visibilityState
      },
    }
    let activeRequests = 0
    let maximumActiveRequests = 0
    const poll = vi.fn<(signal: AbortSignal) => Promise<boolean>>(async (signal) => {
      const request = Promise.withResolvers<boolean>()
      activeRequests += 1
      maximumActiveRequests = Math.max(maximumActiveRequests, activeRequests)
      signal.addEventListener('abort', () => {
        activeRequests -= 1
        request.reject(new DOMException('Aborted', 'AbortError'))
      })
      const shouldContinue = await request.promise
      return shouldContinue
    })
    const stop = startSevenTvPolling({ documentObject, poll })

    visibilityState = 'hidden'
    for (const listener of listeners) {
      listener()
    }
    visibilityState = 'visible'
    for (const listener of listeners) {
      listener()
    }
    await flushPromises()

    expect(poll).toHaveBeenCalledTimes(2)
    expect(maximumActiveRequests).toBe(1)
    stop()
    await flushPromises()
  })

  it('aborts and cannot restart after cleanup', async () => {
    const visibilityState: DocumentVisibilityState = 'visible'
    const listeners = new Set<() => void>()
    let visibilityListener: (() => void) | undefined
    const documentObject = {
      addEventListener: (_type: 'visibilitychange', listener: () => void) => {
        visibilityListener = listener
        listeners.add(listener)
      },
      removeEventListener: (_type: 'visibilitychange', listener: () => void) => {
        listeners.delete(listener)
      },
      get visibilityState() {
        return visibilityState
      },
    }
    let requestSignal: AbortSignal | undefined
    let resolveRequest: ((shouldContinue: boolean) => void) | undefined
    const poll = vi.fn<(signal: AbortSignal) => Promise<boolean>>(async (signal) => {
      const request = Promise.withResolvers<boolean>()
      requestSignal = signal
      resolveRequest = request.resolve
      const shouldContinue = await request.promise
      return shouldContinue
    })
    const stop = startSevenTvPolling({ documentObject, poll })

    stop()

    expect(requestSignal?.aborted).toBeTruthy()
    expect(listeners.size).toBe(0)

    resolveRequest?.(true)
    await flushPromises()
    visibilityListener?.()
    await vi.advanceTimersByTimeAsync(60_000)

    expect(poll).toHaveBeenCalledOnce()
  })

  it('backs off repeated failures', async () => {
    const onError = vi.fn<(error: Error) => void>()
    const poll = vi
      .fn<(signal: AbortSignal) => Promise<boolean>>()
      .mockRejectedValue(new Error('7TV unavailable'))
    const stop = startSevenTvPolling({ onError, poll })

    await flushPromises()

    await vi.advanceTimersByTimeAsync(9999)
    expect(poll).toHaveBeenCalledOnce()
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
