# Vitest Best Practices

This document outlines the best practices for writing tests with Vitest in our project.

## Configuration

We've updated our Vitest configuration in `vitest.config.ts` to include:

- **Automatic mock reset**: `mockReset: true` ensures all mocks are reset between tests
- **Automatic environment variable restoration**: `unstubEnvs: true` restores stubbed environment variables between tests
- **Environment variable loading**: `env: loadEnv('', process.cwd(), '')` loads environment variables from `.env` files

## Environment Variables

When working with environment variables in tests:

1. Use `vi.stubEnv()` instead of directly assigning to `process.env`:

```typescript
// ❌ Don't do this
process.env.NODE_ENV = 'production'

// ✅ Do this instead
vi.stubEnv('NODE_ENV', 'production')
```

2. To unset an environment variable, use `undefined` instead of the `delete` operator:

```typescript
// ❌ Don't do this
delete process.env.SOME_VAR

// ✅ Do this instead
vi.stubEnv('SOME_VAR', undefined)
```

3. Clean up environment variables after tests:

```typescript
afterEach(() => {
  vi.unstubAllEnvs()
})
```

## Mocking Modules

1. Always place `vi.mock()` calls at the top of your file, before imports:

```typescript
// ✅ Do this
import { describe, it, expect, vi } from 'vitest'
vi.mock('./someModule')
import { someFunction } from './someModule'

// ❌ Don't do this
import { describe, it, expect, vi } from 'vitest'
import { someFunction } from './someModule'
vi.mock('./someModule')
```

2. Use `vi.mocked()` to get proper TypeScript typing for mocked functions:

```typescript
import { vi } from 'vitest'
import { someFunction } from './someModule'

vi.mock('./someModule')

// ✅ Do this
vi.mocked(someFunction).mockReturnValue('mocked value')

// ❌ Don't do this
someFunction.mockReturnValue('mocked value')
```

3. Reset mocks between tests:

```typescript
beforeEach(() => {
  vi.resetAllMocks()
})
```

## Mocking Fetch

We've added global helpers in `vitest.setup.ts` to make mocking fetch easier:

```typescript
// Mock a successful response
mockFetch({ data: 'example' })

// Mock a response with specific status
mockFetch({ error: 'Not found' }, { status: 404 })

// Mock a fetch error
mockFetchError('Failed to fetch')

// Mock a network error
mockFetchNetworkError()
```

## Type Safety

1. Avoid using `any` in your tests. Use proper type casting with `unknown`:

```typescript
// ❌ Don't do this
const mockClient = {
  request: vi.fn().mockResolvedValue({})
} as any

// ✅ Do this instead
const mockClient = {
  request: vi.fn().mockResolvedValue({})
} as unknown as ReturnType<typeof create7TVClient>
```

2. Create properly typed mock objects:

```typescript
// Create a properly typed mock response
const mockResponse: SomeType = {
  id: 'test-id',
  name: 'Test Name',
  // ...other required properties
}
```

## Test Structure

1. Use descriptive test names that explain what's being tested
2. Follow the Arrange-Act-Assert pattern:
   - Arrange: Set up the test data and conditions
   - Act: Perform the action being tested
   - Assert: Verify the results

```typescript
it('returns 401 when authorization header is missing in production', async () => {
  // Arrange
  vi.stubEnv('NODE_ENV', 'production')
  const { req, res } = createMocks({ method: 'GET' })

  // Act
  await handler(req, res)

  // Assert
  expect(res.statusCode).toBe(401)
  expect(res._getJSONData()).toEqual({ success: false })
})
```

3. Keep tests focused on a single behavior or functionality
4. Use `beforeEach` and `afterEach` for setup and cleanup

## Additional Resources

- [Vitest Documentation](https://vitest.dev/guide/)
- [Vitest API Reference](https://vitest.dev/api/)
- [Mocking in Vitest](https://vitest.dev/guide/mocking.html)
