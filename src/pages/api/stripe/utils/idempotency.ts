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
  // Check if we've already processed this event
  const existingEvent = await tx.webhookEvent.findUnique({
    where: { stripeEventId: eventId },
  })

  if (existingEvent) {
    console.log(`Event ${eventId} (${eventType}) already processed, skipping`)
    return false // Already processed
  }

  // Record the event to ensure idempotency
  await tx.webhookEvent.create({
    data: {
      stripeEventId: eventId,
      eventType: eventType,
      processedAt: new Date(),
    },
  })

  // Process the event
  await processor(tx)
  return true
}
