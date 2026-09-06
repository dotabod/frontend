export const withErrorHandling = async function withErrorHandling<T>(
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
