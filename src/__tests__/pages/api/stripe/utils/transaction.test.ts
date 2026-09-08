import type { Prisma } from '@prisma/client'
import { PrismaClient } from '@prisma/client'
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { withTransaction } from '@/lib/stripe/utils/transaction'

type TransactionOperation = (tx: Prisma.TransactionClient) => Promise<string>

const transaction = vi.hoisted(() => vi.fn<(operation: TransactionOperation) => Promise<string>>())

vi.mock(import('@/lib/db'), async () => {
  const { PrismaClient } = await import('@prisma/client')
  const db = new PrismaClient()
  Object.defineProperty(db, '$transaction', { value: transaction })
  return { default: db }
})

describe(withTransaction, () => {
  const tx = new PrismaClient()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterAll(async () => {
    await tx.$disconnect()
  })

  it('returns the committed operation value from one transaction attempt', async () => {
    const operation = vi
      .fn<(transactionClient: Prisma.TransactionClient) => Promise<string>>()
      .mockResolvedValue('committed')
    transaction.mockImplementation(async (callback) => await callback(tx))

    await expect(withTransaction(operation)).resolves.toBe('committed')

    expect(transaction).toHaveBeenCalledOnce()
    expect(operation).toHaveBeenCalledOnce()
  })

  it('rejects a callback error without replaying the operation', async () => {
    const callbackError = new Error('callback failed')
    const operation = vi
      .fn<(transactionClient: Prisma.TransactionClient) => Promise<string>>()
      .mockRejectedValue(callbackError)
    transaction.mockImplementation(async (callback) => await callback(tx))

    await expect(withTransaction(operation)).rejects.toBe(callbackError)

    expect(transaction).toHaveBeenCalledOnce()
    expect(operation).toHaveBeenCalledOnce()
  })

  it('rejects a transaction error after one attempt', async () => {
    const transactionError = new Error('transaction failed')
    const operation = vi.fn<TransactionOperation>().mockResolvedValue('ignored')
    transaction.mockRejectedValue(transactionError)

    await expect(withTransaction(operation)).rejects.toBe(transactionError)

    expect(transaction).toHaveBeenCalledOnce()
    expect(operation).not.toHaveBeenCalled()
  })
})
