import type { Prisma } from '@prisma/client'

import type { BillingFacts } from './billing-facts'
import { debugLog } from './debug-log'

export type IdempotentProcessingResult =
  | { kind: 'processed' }
  | { kind: 'duplicate'; processedAt: Date }

export const processEventIdempotently = async function processEventIdempotently(
  eventId: string,
  eventType: string,
  billingFacts: BillingFacts | undefined,
  processor: (tx: Prisma.TransactionClient) => Promise<void>,
  tx: Prisma.TransactionClient,
): Promise<IdempotentProcessingResult> {
  debugLog(`Entering processEventIdempotently for event ${eventId} (${eventType})`)

  if (process.env.VERCEL_ENV !== 'production') {
    await processor(tx)
    return { kind: 'processed' }
  }

  debugLog(`Checking for existing webhookEvent record for event ${eventId}`)
  const existingEvent = await tx.webhookEvent.findUnique({
    where: {
      stripeEventId: eventId,
    },
  })

  if (existingEvent) {
    debugLog(
      `Event ${eventId} (${eventType}) already processed, skipping. Recorded at: ${existingEvent.processedAt.toISOString()}`,
    )
    return { kind: 'duplicate', processedAt: existingEvent.processedAt }
  }
  debugLog(`No existing record found for event ${eventId}. Proceeding to record.`)

  debugLog(`Attempting to create webhookEvent record for event ${eventId}`)
  await tx.webhookEvent.create({
    data: {
      ...(billingFacts && { billingFacts }),
      eventType,
      processedAt: new Date(),
      stripeEventId: eventId,
    },
  })
  debugLog(`Successfully created webhookEvent record for event ${eventId}`)

  debugLog(`Calling processor function for event ${eventId} (${eventType})`)
  await processor(tx)
  debugLog(`Processor function finished successfully for event ${eventId} (${eventType})`)
  return { kind: 'processed' }
}
