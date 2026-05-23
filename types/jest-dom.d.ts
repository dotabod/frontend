import type { TestingLibraryMatchers } from '@testing-library/jest-dom/matchers'

declare global {
  namespace jest {
    interface Matchers<R, T = {}> extends TestingLibraryMatchers<unknown, R> {}
  }
}
