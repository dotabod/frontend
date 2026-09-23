import { runWithExecutionContext } from 'vinext/shims/request-context'
import { describe, expect, it, vi } from 'vitest'

import { scheduleGiftCreditAutoApply } from '../gift-service'

describe('gift credit auto-apply', () => {
  it('registers the delayed apply call with the Worker so it outlives the response', async () => {
    vi.stubEnv('NEXTAUTH_URL', 'https://dotabod.test')
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(Response.json({ success: true }))
    vi.stubGlobal('fetch', fetchMock)
    const backgroundTasks: Promise<unknown>[] = []

    await runWithExecutionContext(
      {
        waitUntil: (task: Promise<unknown>) => {
          backgroundTasks.push(task)
        },
      },
      async () => {
        await scheduleGiftCreditAutoApply('user_recipient')
      },
    )

    expect(fetchMock).not.toHaveBeenCalled()
    expect(backgroundTasks).toHaveLength(1)
    await Promise.all(backgroundTasks)
    expect(fetchMock).toHaveBeenCalledExactlyOnceWith(
      'https://dotabod.test/api/stripe/apply-gift-credit',
      expect.objectContaining({
        body: JSON.stringify({ userId: 'user_recipient' }),
        method: 'POST',
      }),
    )
  })
})
