import type { Prisma } from '@prisma/client';
import { debugLog } from './debugLog';

/**
 * Processes a webhook event idempotently, ensuring it's only processed once
 * @param eventId The Stripe event ID
 * @param eventType The Stripe event type
 * @param processor The function to process the event
 * @param tx The transaction client
 * @returns
 *   - true if the event was newly processed successfully
 *   - { skipped: true, processedAt: Date } if already processed (not an error)
 *   - false if there was an error during processing
 */
export async function processEventIdempotently(
  eventId: string,
  eventType: string,
  processor: (tx: Prisma.TransactionClient) => Promise<void>,
  tx: Prisma.TransactionClient,
): Promise<boolean | { skipped: boolean; processedAt: Date }> {
  debugLog(`Entering processEventIdempotently for event ${eventId} (${eventType})`)

  // Always process dev events
  if (process.env.VERCEL_ENV !== 'production') {
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
      // Return a special value to indicate "already processed" (not an error but also didn't process now)
      return { skipped: true, processedAt: existingEvent.processedAt }
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
        // Try to fetch the existing record to get its processedAt
        const existingEventRetry = await tx.webhookEvent.findUnique({
          where: {
            stripeEventId: eventId,
          },
        })

        if (existingEventRetry) {
          debugLog(
            `Event ${eventId} (${eventType}) already being processed by another request. Recorded at: ${existingEventRetry.processedAt}`,
          )
          return { skipped: true, processedAt: existingEventRetry.processedAt }
        }

        debugLog(
          `Event ${eventId} (${eventType}) already being processed by another request (unique constraint violation), skipping`,
        )
        return { skipped: true, processedAt: new Date() }
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
