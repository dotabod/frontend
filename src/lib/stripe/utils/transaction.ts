import { Prisma } from '@prisma/client'

import prisma from '@/lib/db'

import { debugLog } from './debug-log'

export const withTransaction = async function withTransaction<T>(
  operation: (tx: Prisma.TransactionClient) => Promise<T>,
  maxRetries = 3,
): Promise<T | null> {
  debugLog('Entering withTransaction')
  let retryCount = 0
  let lastError: unknown = null

  while (retryCount < maxRetries) {
    try {
      debugLog(`Attempting transaction, try ${retryCount + 1}/${maxRetries}`)
      const result = await prisma.$transaction(operation, {
        // Ensure consistent reads
        isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
        // Increase from 10000 to 30000 (30 seconds)
        timeout: 30_000,
      })
      debugLog(`Transaction attempt ${retryCount + 1} successful`)
      return result
    } catch (error) {
      lastError = error
      retryCount += 1
      debugLog(`Transaction attempt ${retryCount} failed:`, { error })

      if (retryCount < maxRetries) {
        // Exponential backoff: 500ms, 1s, 2s, etc.
        const delay = 2 ** retryCount * 500
        debugLog(`Waiting ${delay}ms before retry ${retryCount + 1}/${maxRetries}`)
        await new Promise((resolve) => setTimeout(resolve, delay))
      }
    }
  }

  debugLog('Transaction failed after multiple attempts:', { lastError })
  return null
}
