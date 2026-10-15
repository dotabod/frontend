import { runWithExecutionContext } from 'vinext/shims/request-context'
import { describe, expect, it, vi } from 'vitest'

import { scheduleGiftCreditAutoApply } from '../gift-service'

type Apply = NonNullable<Parameters<typeof scheduleGiftCreditAutoApply>[1]>

const input = { stripeCustomerId: 'cus_recipient', userId: 'user_recipient' }

const scheduleInWorker = async (apply: Apply): Promise<Promise<unknown>[]> => {
  const backgroundTasks: Promise<unknown>[] = []

  await runWithExecutionContext(
    {
      waitUntil: (task: Promise<unknown>) => {
        backgroundTasks.push(task)
      },
    },
    async () => {
      await scheduleGiftCreditAutoApply(input, apply)
    },
  )

  return backgroundTasks
}

describe('gift credit auto-apply', () => {
  it('applies the recipient credit in this invocation and registers it with the Worker', async () => {
    const apply = vi
      .fn<Apply>()
      .mockResolvedValue({ creditApplied: 6, kind: 'applied', priceId: 'price_monthly' })

    const backgroundTasks = await scheduleInWorker(apply)

    expect(backgroundTasks).toHaveLength(1)
    await Promise.all(backgroundTasks)
    expect(apply).toHaveBeenCalledExactlyOnceWith(input)
  })

  it('keeps the webhook successful when applying the credit fails', async () => {
    const apply = vi.fn<Apply>().mockRejectedValue(new Error('stripe unavailable'))

    const backgroundTasks = await scheduleInWorker(apply)

    await expect(Promise.all(backgroundTasks)).resolves.toHaveLength(1)
    expect(apply).toHaveBeenCalledOnce()
  })
})
