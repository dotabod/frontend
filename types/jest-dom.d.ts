import type { TestingLibraryMatchers } from '@testing-library/jest-dom/matchers'

declare module '@voidzero-dev/vite-plus-test' {
  interface Matchers<
    R extends void | Promise<void> = void | Promise<void>,
    T = unknown,
  > extends TestingLibraryMatchers<unknown, R> {}
}

declare global {
  namespace jest {
    interface Matchers<R, T = {}> extends TestingLibraryMatchers<unknown, R> {}
  }
}
