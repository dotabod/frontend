import type { Prisma } from '@prisma/client'

/**
 * Processes a webhook event idempotently, ensuring it's only processed once
 * @param eventId The Stripe event ID
 * @param eventType The Stripe event type
 * @param processor The function to process the event
 * @param tx The transaction client
 * @returns True if the event was processed, false if it was already processed
 */
export async function processEventIdempotently(
  eventId: string,
  eventType: string,
  processor: (tx: Prisma.TransactionClient) => Promise<void>,
  tx: Prisma.TransactionClient,
): Promise<boolean> {
  try {
    // Check if we've already processed this event
    const existingEvent = await tx.webhookEvent.findUnique({
      where: {
        stripeEventId: eventId,
      },
    })

    if (existingEvent) {
      console.log(`Event ${eventId} (${eventType}) already processed, skipping`)
      return true // Already processed, but not an error
    }

    // Record the event to ensure idempotency
    try {
      await tx.webhookEvent.create({
        data: {
          stripeEventId: eventId,
          eventType: eventType,
          processedAt: new Date(),
        },
      })
    } catch (error) {
      // If the error is a unique constraint violation, it means another concurrent
      // process has already recorded this event, so we can safely skip processing
      if (error.code === 'P2002' && error.meta?.target?.includes('stripeEventId')) {
        console.log(
          `Event ${eventId} (${eventType}) already being processed by another request, skipping`,
        )
        return true // Already being processed, but not an error
      }
      throw error // Re-throw other errors
    }

    // Process the event
    await processor(tx)
    return true
  } catch (error) {
    console.error(`Error processing event ${eventId} (${eventType}):`, error)
    return false
  }
}
