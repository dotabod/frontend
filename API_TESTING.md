# API Testing Documentation

This document provides guidelines and examples for testing API endpoints in our application using Vitest.

## Setup

We use the following tools for API testing:

- **Vitest**: Fast testing framework powered by Vite
- **node-mocks-http**: For mocking HTTP requests and responses
- **vi.mock()**: For mocking dependencies like Prisma, Next Auth, etc.

## Test Structure

API tests should be placed in a `__tests__` directory adjacent to the API file being tested, with a `.test.ts` extension.

Example:
```
src/
  pages/
    api/
      is-dotabod-live.ts
      __tests__/
        is-dotabod-live.test.ts
```

## Basic Test Template

Here's a basic template for testing an API endpoint:

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createMocks } from 'node-mocks-http'
import handler from '../your-api-file'

// Mock dependencies
vi.mock('@/lib/db', () => ({
  default: {
    // Mock your database models and methods
  },
}))

// Import mocked modules
import prisma from '@/lib/db'

describe('Your API Name', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('handles successful requests', async () => {
    // Create mock request and response
    const { req, res } = createMocks({
      method: 'GET',
      query: { /* query params */ },
      body: { /* request body */ },
    })

    // Mock database responses
    vi.mocked(prisma.model.method).mockResolvedValueOnce(/* mock data */)

    // Call the handler
    await handler(req, res)

    // Assert response
    expect(res.statusCode).toBe(200)
    expect(res._getJSONData()).toEqual(/* expected response */)
  })

  it('handles error cases', async () => {
    // Similar structure for error cases
  })
})
```

## Testing Different HTTP Methods

Test different HTTP methods by setting the appropriate method in the mock request:

```typescript
const { req, res } = createMocks({
  method: 'POST', // or 'GET', 'PUT', 'DELETE', etc.
})
```

## Mocking Database Calls

Mock Prisma database calls using `vi.mock()`:

```typescript
vi.mock('@/lib/db', () => ({
  default: {
    user: {
      findFirst: vi.fn(),
    },
  },
}))

// Then in your test
vi.mocked(prisma.user.findFirst).mockResolvedValueOnce({
  id: 'user-123',
  name: 'Test User',
})
```

## Mocking Authentication

For endpoints that require authentication, mock the authentication process:

```typescript
vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}))

// Mock authenticated session
vi.mocked(getServerSession).mockResolvedValueOnce({
  user: { id: 'user-123' },
})

// Mock unauthenticated session
vi.mocked(getServerSession).mockResolvedValueOnce(null)
```

## Testing Error Handling

Test how your API handles errors by mocking rejected promises:

```typescript
// Mock database error
const mockError = new Error('Database error')
vi.mocked(prisma.user.findFirst).mockRejectedValueOnce(mockError)

// Assert error response
expect(res.statusCode).toBe(500)
expect(res._getJSONData()).toEqual({ error: 'Error message' })
```

## Testing External API Calls

For endpoints that call external APIs, mock the fetch function:

```typescript
global.fetch = vi.fn()

// Mock successful response
global.fetch = vi.fn().mockResolvedValueOnce({
  ok: true,
  json: () => Promise.resolve({ data: 'response data' }),
})

// Mock failed response
global.fetch = vi.fn().mockRejectedValueOnce(new Error('Fetch error'))
```

## Running Tests

Run API tests using the following commands:

```bash
# Run all tests
bun run test

# Run specific API tests
bun run test --run api-file-name
```

## Best Practices

1. **Test all paths**: Test successful requests, error cases, and edge cases.
2. **Mock all external dependencies**: Database, authentication, external APIs, etc.
3. **Verify correct parameters**: Check that your API calls external services with the correct parameters.
4. **Test response structure**: Verify that the API returns the expected response structure.
5. **Test HTTP status codes**: Verify that the API returns the correct HTTP status codes.
6. **Reset mocks between tests**: Use `beforeEach` and `afterEach` to reset mocks between tests.
7. **Isolate tests**: Each test should be independent of others.

## Examples

See the following test files for examples:

- `src/pages/api/__tests__/is-dotabod-live.test.ts`: Simple GET endpoint with database query
- `src/pages/api/__tests__/languages.test.ts`: API that calls an external service
- `src/pages/api/user/__tests__/gift-subscriptions.test.ts`: Authenticated API with complex response

## Recently Added Tests

### Overlay API Tests

#### Gift Alert API (`src/pages/api/overlay/__tests__/gift-alert.test.ts`)

This test suite verifies the functionality of the gift alert API endpoint, which is used to retrieve and mark as read gift subscription notifications. The tests use a mock handler approach to simulate the API behavior without relying on actual database calls.

Tests include:
- Authentication validation
- Handling missing notifications
- Retrieving notification details
- Marking notifications as read
- Error handling

#### Test Gift Notification API (`src/pages/api/__tests__/test-gift-notification.test.ts`)

This test suite verifies the functionality of the test gift notification API endpoint, which is used by administrators to create test gift notifications in the development environment. The tests use a mock handler approach to simulate the API behavior.

Tests include:
- Environment validation (development only)
- Authentication and authorization validation
- Gift type validation
- Gift quantity validation
- Creating monthly gift notifications
- Creating lifetime gift notifications

### Subscription API Tests

#### By Username API (`src/pages/api/subscription/__tests__/by-username.test.ts`)

This test suite verifies the functionality of the by-username API endpoint, which retrieves subscription information for a given username. The tests cover various scenarios including missing usernames, user not found, and different subscription tiers.

Tests include:
- Handling missing username parameter
- Handling user not found
- Returning FREE tier for users without subscriptions
- Returning PRO tier for active, lifetime, and gift subscriptions
- Handling grace periods
- Error handling
