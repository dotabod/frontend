import prisma from '@/lib/db'
import { Prisma } from '@prisma/client'

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
  let retryCount = 0
  let lastError: Error | unknown = null

  while (retryCount < maxRetries) {
    try {
      return await prisma.$transaction(operation, {
        timeout: 30000, // Increase from 10000 to 30000 (30 seconds)
        isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted, // Ensure consistent reads
      })
    } catch (error) {
      lastError = error
      retryCount++
      console.error(`Transaction attempt ${retryCount} failed:`, error)

      if (retryCount < maxRetries) {
        // Exponential backoff: 500ms, 1s, 2s, etc.
        const delay = 2 ** retryCount * 500
        await new Promise((resolve) => setTimeout(resolve, delay))
      }
    }
  }

  console.error('Transaction failed after multiple attempts:', lastError)
  return null
}
