# Testing Documentation

This project uses Vitest for testing React components and other code. This document provides an overview of the testing setup and guidelines.

## Setup

The testing environment is configured with:

- **Vitest**: Fast testing framework powered by Vite
- **@testing-library/react**: For rendering and testing React components
- **@testing-library/jest-dom**: For additional DOM matchers
- **happy-dom**: For simulating a DOM environment

## Running Tests

```bash
# Run all tests
bun run test

# Run tests in watch mode
bun run test:watch

# Run specific tests by name pattern
bun run test --run ComponentName

# Run tests with coverage
bun run test:coverage
```

## Test File Structure

Test files should be placed in a `__tests__` directory adjacent to the component or in the same directory with a `.test.tsx` or `.test.jsx` extension.

Example:
```
src/
  components/
    Button.tsx
    __tests__/
      Button.test.tsx
```

## Writing Tests

### Component Tests

For React components, we use React Testing Library to render and interact with components. Here's a basic example:

```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MyComponent } from '../MyComponent'

describe('MyComponent', () => {
  it('renders correctly', () => {
    render(<MyComponent />)
    expect(screen.getByText('Expected Text')).toBeInTheDocument()
  })
})
```

### Mocking Dependencies

Use Vitest's mocking capabilities to mock dependencies:

```tsx
import { vi } from 'vitest'

// Mock a module
vi.mock('module-name', () => ({
  functionName: vi.fn(),
}))

// Mock a specific function
const mockFn = vi.fn()
```

### Testing Async Code

For testing asynchronous code:

```tsx
it('handles async operations', async () => {
  render(<AsyncComponent />)

  // Wait for element to appear
  await screen.findByText('Loaded')

  // Make assertions
  expect(screen.getByText('Loaded')).toBeInTheDocument()
})
```

## Best Practices

1. **Test Behavior, Not Implementation**: Focus on what the component does, not how it does it.
2. **Keep Tests Independent**: Each test should be able to run independently of others.
3. **Use Descriptive Test Names**: Test names should clearly describe what is being tested.
4. **Avoid Testing Implementation Details**: Test the public API of your components, not internal details.
5. **Clean Up After Tests**: Use `afterEach` or `afterAll` to clean up any side effects.

## Coverage

We aim for high test coverage, but quality of tests is more important than quantity. Run coverage reports to identify areas that need more testing:

```bash
bun run test:coverage
```

Coverage reports are generated in the `coverage` directory.
