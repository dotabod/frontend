import * as matchers from '@testing-library/jest-dom/matchers'
import React from 'react'
import { expect, vi } from 'vitest'

expect.extend(matchers)

// Mock the framer-motion
vi.mock('framer-motion', () => ({
  AnimatePresence: ({ children }: React.PropsWithChildren) => children,
  motion: {
    div: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) =>
      React.createElement('div', props, children),
  },
}))

// Mock the Prisma Mongo client
vi.mock('.prisma-mongo/client', () => {
  function MockPrismaMongoClient(this: Record<string, unknown>) {
    this.$disconnect = vi.fn().mockResolvedValue()
    this.cards = {
      findUnique: vi.fn().mockResolvedValue({ id: 'mock-card-id' }),
    }
    this.notablePlayers = {
      findUnique: vi.fn().mockResolvedValue({ id: 'mock-player-id' }),
    }
  }

  return {
    PrismaClient: MockPrismaMongoClient,
  }
})

// Mock any other dependencies as needed
vi.mock('@/lib/hooks/useTransformRes', () => ({
  useTransformRes: () => (params: Record<string, unknown>) => params,
}))

// Create a helper for mocking fetch responses
interface MockFetchOptions {
  status?: number
  statusText?: string
  headers?: Record<string, string>
}

// Helper function to create fetch responses
globalThis.createFetchResponse = (data: unknown, options: MockFetchOptions = {}) =>
  ({
    arrayBuffer: async () => Promise.resolve(new ArrayBuffer(0)),
    blob: async () => Promise.resolve(new Blob([])),
    body: null,
    bodyUsed: false,
    clone() {
      return this
    },
    formData: async () => Promise.resolve(new FormData()),
    headers: new Headers(options.headers || { 'Content-Type': 'application/json' }),
    json: async () => Promise.resolve(data),
    ok: options.status ? options.status >= 200 && options.status < 300 : true,
    redirected: false,
    status: options.status || 200,
    statusText: options.statusText || 'OK',
    text: async () => Promise.resolve(JSON.stringify(data)),
    type: 'basic',
    url: '',
  }) as unknown as Response

// Add global fetch mock helper
globalThis.mockFetch = (response: unknown, options: MockFetchOptions = {}) => {
  globalThis.fetch = vi.fn().mockResolvedValue(createFetchResponse(response, options))
}

// Add global fetch error mock helper
globalThis.mockFetchError = (errorMessage: string) => {
  globalThis.fetch = vi.fn().mockRejectedValue(new Error(errorMessage))
}

// Add global fetch network error mock helper
globalThis.mockFetchNetworkError = () => {
  globalThis.fetch = vi.fn().mockRejectedValue(new TypeError('Network request failed'))
}

// Add type definitions for the global helpers
declare global {
  var createFetchResponse: (data: unknown, options?: MockFetchOptions) => Response
  var mockFetch: (response: unknown, options?: MockFetchOptions) => void
  var mockFetchError: (errorMessage: string) => void
  var mockFetchNetworkError: () => void
}
