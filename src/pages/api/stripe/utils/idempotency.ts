import type { Prisma } from '@prisma/client'
import { debugLog } from './debugLog'

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
  debugLog(`Entering processEventIdempotently for event ${eventId} (${eventType})`)

  // Always process dev events
  if (process.env.NODE_ENV === 'development') {
    await processor(tx)
    return true
  }

  try {
    // Check if we've already processed this event
    debugLog(`Checking for existing webhookEvent record for event ${eventId}`)
    const existingEvent = await tx.webhookEvent.findUnique({
      where: {
        stripeEventId: eventId,
      },
    })

    if (existingEvent) {
      debugLog(
        `Event ${eventId} (${eventType}) already processed, skipping. Recorded at: ${existingEvent.processedAt}`,
      )
      return true // Already processed, but not an error
    }
    debugLog(`No existing record found for event ${eventId}. Proceeding to record.`)

    // Record the event to ensure idempotency
    try {
      debugLog(`Attempting to create webhookEvent record for event ${eventId}`)
      await tx.webhookEvent.create({
        data: {
          stripeEventId: eventId,
          eventType: eventType,
          processedAt: new Date(),
        },
      })
      debugLog(`Successfully created webhookEvent record for event ${eventId}`)
    } catch (error) {
      debugLog(`Error creating webhookEvent record for event ${eventId}`, { error })
      // If the error is a unique constraint violation, it means another concurrent
      // process has already recorded this event, so we can safely skip processing
      if (error.code === 'P2002' && error.meta?.target?.includes('stripeEventId')) {
        debugLog(
          `Event ${eventId} (${eventType}) already being processed by another request (unique constraint violation), skipping`,
        )
        return true // Already being processed, but not an error
      }
      throw error // Re-throw other errors
    }

    // Process the event
    debugLog(`Calling processor function for event ${eventId} (${eventType})`)
    await processor(tx)
    debugLog(`Processor function finished successfully for event ${eventId} (${eventType})`)
    return true
  } catch (error) {
    debugLog(`Error processing event ${eventId} (${eventType}):`, { error })
    return false
  }
}
