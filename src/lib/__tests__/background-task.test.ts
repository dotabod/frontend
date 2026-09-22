import { getRequestExecutionContext, runWithExecutionContext } from 'vinext/shims/request-context'
import { describe, expect, it, vi } from 'vitest'

import { runBackgroundTask } from '../background-task'

describe('background tasks', () => {
  it('registers pending work with the Worker without waiting for completion', async () => {
    const deferred = Promise.withResolvers<boolean>()
    const context = { waitUntil: vi.fn<(task: Promise<unknown>) => void>() }

    await runWithExecutionContext(context, async () => {
      await runBackgroundTask(deferred.promise)
    })

    expect(context.waitUntil).toHaveBeenCalledWith(deferred.promise)
    deferred.resolve(true)
    await deferred.promise
  })

  it('awaits work outside a Worker request', async () => {
    const deferred = Promise.withResolvers<boolean>()
    let completed = false
    const result = runBackgroundTask(deferred.promise).then(() => {
      completed = true
    })

    await Promise.resolve()
    expect(completed).toBeFalsy()
    deferred.resolve(true)
    await result
    expect(completed).toBeTruthy()
  })

  it('keeps concurrent request contexts separate across async continuations', async () => {
    const first = { waitUntil: vi.fn<(task: Promise<unknown>) => void>() }
    const second = { waitUntil: vi.fn<(task: Promise<unknown>) => void>() }
    const firstTask = Promise.resolve('first')
    const secondTask = Promise.resolve('second')

    await Promise.all([
      runWithExecutionContext(first, async () => {
        await Promise.resolve()
        await runBackgroundTask(firstTask)
      }),
      runWithExecutionContext(second, async () => {
        await Promise.resolve()
        await runBackgroundTask(secondTask)
      }),
    ])

    expect(first.waitUntil).toHaveBeenCalledExactlyOnceWith(firstTask)
    expect(second.waitUntil).toHaveBeenCalledExactlyOnceWith(secondTask)
    expect(getRequestExecutionContext()).toBeNull()
  })
})
