import { Prisma } from '@prisma/client'
import prisma from '@/lib/db'
import { debugLog } from './debugLog'

/**
 * Executes an operation within a database transaction with retry logic
 * @param operation The operation to execute within the transaction
 * @param maxRetries Maximum number of retry attempts (default: 3)
 * @returns The result of the operation or null if all retries failed
 */
export async function withTransaction<T>(
  operation: (tx: Prisma.TransactionClient) => Promise<T>,
  maxRetries = 3,
): Promise<T | null> {
  debugLog('Entering withTransaction')
  let retryCount = 0
  let lastError: Error | unknown = null

  while (retryCount < maxRetries) {
    try {
      debugLog(`Attempting transaction, try ${retryCount + 1}/${maxRetries}`)
      const result = await prisma.$transaction(operation, {
        timeout: 30000, // Increase from 10000 to 30000 (30 seconds)
        isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted, // Ensure consistent reads
      })
      debugLog(`Transaction attempt ${retryCount + 1} successful`)
      return result
    } catch (error) {
      lastError = error
      retryCount++
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
