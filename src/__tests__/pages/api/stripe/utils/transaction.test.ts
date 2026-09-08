import { beforeEach, describe, expect, it, vi } from 'vitest'

import { withTransaction } from '@/lib/stripe/utils/transaction'

const transaction = vi.hoisted(() => vi.fn())

vi.mock('@/lib/db', () => ({
  default: {
    $transaction: transaction,
  },
}))

describe(withTransaction, () => {
  beforeEach(() => {
    transaction.mockReset()
  })

  it('returns the committed operation value from one transaction attempt', async () => {
    const operation = vi.fn().mockResolvedValue('committed')
    transaction.mockImplementation(async (callback: (tx: object) => Promise<unknown>) =>
      callback({}),
    )

    await expect(withTransaction(operation)).resolves.toBe('committed')

    expect(transaction).toHaveBeenCalledOnce()
    expect(operation).toHaveBeenCalledOnce()
  })

  it('rejects a callback error without replaying the operation', async () => {
    const callbackError = new Error('callback failed')
    const operation = vi.fn().mockRejectedValue(callbackError)
    transaction.mockImplementation(async (callback: (tx: object) => Promise<unknown>) =>
      callback({}),
    )

    await expect(withTransaction(operation)).rejects.toBe(callbackError)

    expect(transaction).toHaveBeenCalledOnce()
    expect(operation).toHaveBeenCalledOnce()
  })

  it('rejects a transaction error after one attempt', async () => {
    const transactionError = new Error('transaction failed')
    transaction.mockRejectedValue(transactionError)

    await expect(withTransaction(async () => 'ignored')).rejects.toBe(transactionError)

    expect(transaction).toHaveBeenCalledOnce()
  })
})
