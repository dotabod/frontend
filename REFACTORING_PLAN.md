# Webhook Handler Refactoring Plan

The current webhook handler is becoming complex and difficult to maintain. Here's a plan to refactor it into a more modular and maintainable structure.

## Current Issues

1. **Complexity**: The file is large and handles many different types of events with complex logic.
2. **Duplication**: Similar logic is repeated across different event handlers.
3. **Maintainability**: It's difficult to understand the full flow and make changes safely.
4. **Error Handling**: Error handling is inconsistent across different parts of the code.
5. **Multiple Gift Subscriptions**: The current implementation doesn't properly handle multiple gift subscriptions extending the pause date.

## Refactoring Approach

### 1. Split into Modules

Create a modular structure with separate files for different concerns:

```
src/
  pages/
    api/
      stripe/
        webhook.ts                  # Main entry point
        handlers/                   # Event-specific handlers
          subscription-events.ts    # Subscription-related events
          invoice-events.ts         # Invoice-related events
          checkout-events.ts        # Checkout-related events
          charge-events.ts          # Charge-related events
          customer-events.ts        # Customer-related events
        services/                   # Reusable services
          subscription-service.ts   # Subscription-related operations
          gift-service.ts           # Gift subscription operations
          customer-service.ts       # Customer-related operations
        utils/                      # Helper utilities
          idempotency.ts            # Idempotency handling
          error-handling.ts         # Error handling utilities
          transaction.ts            # Transaction utilities
```

### 2. Create Service Classes

Implement service classes for common operations:

#### SubscriptionService

```typescript
class SubscriptionService {
  constructor(private tx: Prisma.TransactionClient) {}

  async upsertSubscription(subscription: Stripe.Subscription, userId: string): Promise<void> {
    // Logic to upsert subscription
  }

  async pauseForGift(subscriptionId: string, giftExpirationDate: Date, metadata: Record<string, string | number | boolean | null>): Promise<void> {
    // Logic to pause subscription for gift
  }

  async updateProExpiration(userId: string, expirationDate: Date): Promise<void> {
    // Logic to update proExpiration
  }
}
```

#### GiftService

```typescript
class GiftService {
  constructor(private tx: Prisma.TransactionClient) {}

  async processGiftCheckout(session: Stripe.Checkout.Session): Promise<void> {
    // Logic to process gift checkout
  }

  async extendSubscriptionWithGift(userId: string, giftType: string, giftQuantity: number): Promise<Date> {
    // Logic to extend subscription with gift
  }
}
```

### 3. Implement Event Handlers

Create specific handlers for each event type:

```typescript
// subscription-events.ts
export async function handleSubscriptionCreated(subscription: Stripe.Subscription, tx: Prisma.TransactionClient): Promise<void> {
  // Logic for subscription created
}

export async function handleSubscriptionUpdated(subscription: Stripe.Subscription, tx: Prisma.TransactionClient): Promise<void> {
  // Logic for subscription updated
}

export async function handleSubscriptionDeleted(subscription: Stripe.Subscription, tx: Prisma.TransactionClient): Promise<void> {
  // Logic for subscription deleted
}
```

### 4. Improve Error Handling

Implement consistent error handling across all handlers:

```typescript
// error-handling.ts
export async function withErrorHandling<T>(
  operation: () => Promise<T>,
  context: string,
  userId?: string
): Promise<T | null> {
  try {
    return await operation();
  } catch (error) {
    console.error(`Error in ${context}${userId ? ` for user ${userId}` : ''}:`, error);
    // Optional: Log to monitoring service
    return null;
  }
}
```

### 5. Implement Transaction Utilities

Create utilities for transaction management:

```typescript
// transaction.ts
export async function withTransaction<T>(
  operation: (tx: Prisma.TransactionClient) => Promise<T>,
  maxRetries = 3
): Promise<T | null> {
  let retryCount = 0;
  let lastError: Error | unknown = null;

  while (retryCount < maxRetries) {
    try {
      return await prisma.$transaction(operation, { timeout: 10000 });
    } catch (error) {
      lastError = error;
      retryCount++;
      console.error(`Transaction attempt ${retryCount} failed:`, error);

      if (retryCount < maxRetries) {
        const delay = 2 ** retryCount * 500;
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  console.error('Transaction failed after multiple attempts:', lastError);
  return null;
}
```

### 6. Implement Idempotency Handling

Create a utility for idempotency:

```typescript
// idempotency.ts
export async function processEventIdempotently(
  eventId: string,
  eventType: string,
  processor: (tx: Prisma.TransactionClient) => Promise<void>,
  tx: Prisma.TransactionClient
): Promise<boolean> {
  // Check if we've already processed this event
  const existingEvent = await tx.webhookEvent.findUnique({
    where: { stripeEventId: eventId },
  });

  if (existingEvent) {
    return false; // Already processed
  }

  // Record the event to ensure idempotency
  await tx.webhookEvent.create({
    data: {
      stripeEventId: eventId,
      eventType: eventType,
      processedAt: new Date(),
    },
  });

  // Process the event
  await processor(tx);
  return true;
}
```

### 7. Main Webhook Handler

Simplify the main webhook handler:

```typescript
// webhook.ts
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { event, error } = await verifyWebhook(req);
  if (error) {
    return res.status(400).json({ error });
  }

  if (!relevantEvents.has(event.type)) {
    return res.status(200).json({ received: true });
  }

  const result = await withTransaction(async (tx) => {
    return processEventIdempotently(
      event.id,
      event.type,
      async (tx) => {
        await processWebhookEvent(event, tx);
      },
      tx
    );
  });

  if (result === null) {
    return res.status(500).json({ error: 'Webhook processing failed' });
  }

  return res.status(200).json({ received: true });
}
```

## Implementation Plan

1. **Phase 1**: Create the folder structure and move existing code
2. **Phase 2**: Implement service classes and utilities
3. **Phase 3**: Refactor event handlers to use the new services
4. **Phase 4**: Update the main webhook handler
5. **Phase 5**: Add comprehensive tests for each component
6. **Phase 6**: Deploy and monitor

## Benefits

1. **Maintainability**: Smaller, focused files are easier to understand and maintain
2. **Testability**: Modular code is easier to test
3. **Scalability**: New event types can be added without modifying existing code
4. **Reliability**: Consistent error handling and transaction management
5. **Performance**: Better handling of multiple gift subscriptions and edge cases
