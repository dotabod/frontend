// Hyperdrive sometimes loses its connection to the origin database in the middle of a query
// (Sentry DOTABOD-FRONTEND-15T and DOTABOD-FRONTEND-15C). A read can safely run again on a fresh
// connection. A write is never retried, because the first attempt may already have committed.
const DROPPED_CONNECTION_MESSAGES = [
  'Egress connection severed outside of Hyperdrive',
  'Connection to the origin database was lost',
  'Connection terminated unexpectedly',
]

const READ_OPERATIONS = new Set([
  'aggregate',
  'count',
  'findFirst',
  'findFirstOrThrow',
  'findMany',
  'findUnique',
  'findUniqueOrThrow',
  'groupBy',
])

// The Prisma pg adapter raises Hyperdrive's error as a DriverAdapterError with the same message,
// and raises pg's own error unchanged when the socket closes. Prisma may wrap either one.
export const isDroppedConnectionError = function isDroppedConnectionError(cause: unknown): boolean {
  if (!(cause instanceof Error)) {
    return false
  }
  return (
    DROPPED_CONNECTION_MESSAGES.some((message) => cause.message.includes(message)) ||
    isDroppedConnectionError(cause.cause)
  )
}

export const retryReadOnDroppedConnection = async function retryReadOnDroppedConnection<T>(
  operation: string,
  run: () => Promise<T>,
): Promise<T> {
  try {
    return await run()
  } catch (error) {
    if (!READ_OPERATIONS.has(operation) || !isDroppedConnectionError(error)) {
      throw error
    }
    console.warn(`Retrying ${operation} after the database connection dropped`)
    return await run()
  }
}
