import { describe, expect, it, vi } from 'vitest'

import { runScheduledJobs } from '@/lib/scheduled-jobs'

type Reporter = NonNullable<Parameters<typeof runScheduledJobs>[1]>

const createReporter = () => {
  const capture = vi.fn<Reporter['capture']>()
  const flush = vi.fn<Reporter['flush']>().mockResolvedValue(true)
  return { capture, flush, reporter: { capture, flush } }
}

describe(runScheduledJobs, () => {
  it('waits for Sentry to send once the jobs finish', async () => {
    const jobs = Promise.withResolvers<boolean>()
    const { capture, flush, reporter } = createReporter()

    const run = runScheduledJobs(async () => {
      await jobs.promise
    }, reporter)
    await Promise.resolve()
    expect(flush).not.toHaveBeenCalled()

    jobs.resolve(true)
    await run

    expect(flush).toHaveBeenCalledWith(2000)
    expect(capture).not.toHaveBeenCalled()
  })

  it('reports a job that throws, sends the report, and still fails the run', async () => {
    const failure = new Error('database unreachable')
    const { capture, flush, reporter } = createReporter()

    await expect(
      runScheduledJobs(vi.fn<() => Promise<void>>().mockRejectedValue(failure), reporter),
    ).rejects.toBe(failure)

    expect(capture).toHaveBeenCalledWith(failure)
    expect(flush).toHaveBeenCalledWith(2000)
    expect(capture.mock.invocationCallOrder[0]).toBeLessThan(flush.mock.invocationCallOrder[0] ?? 0)
  })
})
