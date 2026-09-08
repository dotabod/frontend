import { Prisma } from '@prisma/client'

import prisma from '@/lib/db'

import { debugLog } from './debug-log'

export const withTransaction = async function withTransaction<T>(
  operation: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  debugLog('Entering withTransaction')
  const result = await prisma.$transaction(operation, {
    isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
    timeout: 30_000,
  })
  debugLog('Transaction successful')
  return result
}
