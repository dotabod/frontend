# Stripe Webhook Refactoring

## Overview

This document outlines the refactoring of the Stripe webhook handler to improve maintainability, testability, and error handling. The refactoring follows a modular approach, separating concerns into distinct components.

## Architecture

The refactored webhook handler follows a layered architecture:

1. **Main Webhook Handler** (`webhook.ts.new`): Entry point that receives webhook events, verifies signatures, and routes to appropriate handlers.

2. **Event Handlers**: Specialized modules for handling specific event types:
   - `subscription-events.ts`: Handles subscription created, updated, and deleted events
   - `invoice-events.ts`: Handles invoice payment succeeded and failed events
   - `checkout-events.ts`: Handles checkout session completed events
   - `charge-events.ts`: Handles charge succeeded events
   - `customer-events.ts`: Handles customer deleted events

3. **Services**: Business logic for different domains:
   - `subscription-service.ts`: Manages subscription operations
   - `gift-service.ts`: Handles gift subscription operations
   - `customer-service.ts`: Manages customer operations

4. **Utilities**:
   - `transaction.ts`: Provides transaction management with retry logic
   - `idempotency.ts`: Ensures events are processed only once
   - `error-handling.ts`: Consistent error handling across the application

## Key Improvements

1. **Modularity**: Code is organized into focused, single-responsibility modules.

2. **Error Handling**: Consistent error handling with proper logging.

3. **Transaction Management**: All database operations run in transactions with retry logic.

4. **Idempotency**: Events are processed exactly once, preventing duplicate operations.

5. **Testability**: Modular design makes unit testing easier.

6. **Type Safety**: Improved TypeScript types throughout the codebase.

## Testing

Two testing resources have been created:

1. **Stripe CLI Commands** (`stripe-test-commands.md`): A collection of Stripe CLI commands to test different webhook events.

2. **Testing Script** (`test-webhook.sh`): An interactive shell script to run common test scenarios.

### Price IDs

The testing tools use environment variables for Stripe price IDs with fallbacks to default values:

```bash
PRICE_ID_MONTHLY="${NEXT_PUBLIC_STRIPE_PRO_MONTHLY_PRICE_ID:-price_monthly123}"
PRICE_ID_ANNUAL="${NEXT_PUBLIC_STRIPE_PRO_ANNUAL_PRICE_ID:-price_annual123}"
PRICE_ID_LIFETIME="${NEXT_PUBLIC_STRIPE_PRO_LIFETIME_PRICE_ID:-price_lifetime123}"
```

If your environment has these variables set, the tests will use the actual price IDs. Otherwise, they'll use the default values.

### Running Tests

1. Start the webhook forwarding:
   ```bash
   stripe listen --forward-to http://localhost:3000/api/stripe/webhook
   ```

2. Run the test script:
   ```bash
   chmod +x test-webhook.sh
   ./test-webhook.sh
   ```

3. Or run individual commands from `stripe-test-commands.md`.

## Implementation Details

### Webhook Handler

The main webhook handler:
- Verifies the webhook signature
- Extracts the event type
- Routes to the appropriate handler based on event type
- Ensures idempotent processing
- Wraps operations in database transactions
- Provides consistent error responses

### Event Handlers

Each event handler:
- Processes a specific type of Stripe event
- Extracts relevant data from the event
- Calls appropriate service methods
- Returns a success/failure indicator

### Services

Services contain the business logic for:
- Creating and updating subscriptions
- Managing gift subscriptions
- Handling customer operations
- Updating user pro expiration dates

## Migration Plan

To migrate to the new webhook handler:

1. Deploy the new handler alongside the existing one
2. Run tests to ensure all functionality works correctly
3. Switch the webhook endpoint in Stripe from the old to the new handler
4. Monitor for any issues
5. Remove the old handler once the new one is stable

## Future Improvements

Potential future improvements:
- Add more comprehensive logging
- Implement monitoring and alerting
- Add more test coverage
- Consider adding a queue for processing webhook events asynchronously
