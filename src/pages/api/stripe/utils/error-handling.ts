/**
 * Utility functions for consistent error handling in webhook handlers
 */

/**
 * Executes an operation with consistent error handling
 * @param operation The async operation to execute
 * @param context Description of the operation context for error logging
 * @param userId Optional user ID for more detailed error logging
 * @returns The result of the operation or null if an error occurred
 */
export async function withErrorHandling<T>(
  operation: () => Promise<T>,
  context: string,
  userId?: string,
): Promise<T | null> {
  try {
    return await operation()
  } catch (error) {
    console.error(`Error in ${context}${userId ? ` for user ${userId}` : ''}:`, error)
    // Optional: Log to monitoring service
    return null
  }
}

/**
 * Executes an operation with consistent error handling and returns a boolean success indicator
 * @param operation The async operation to execute
 * @param context Description of the operation context for error logging
 * @param userId Optional user ID for more detailed error logging
 * @returns True if the operation succeeded, false otherwise
 */
export async function withErrorHandlingBoolean(
  operation: () => Promise<void>,
  context: string,
  userId?: string,
): Promise<boolean> {
  try {
    await operation()
    return true
  } catch (error) {
    console.error(`Error in ${context}${userId ? ` for user ${userId}` : ''}:`, error)
    // Optional: Log to monitoring service
    return false
  }
}
