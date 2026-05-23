import '@testing-library/jest-dom'
import React from 'react'
import { vi } from 'vite-plus/test'

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
global.createFetchResponse = (data: unknown, options: MockFetchOptions = {}) => ({
  arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
  blob: () => Promise.resolve(new Blob([])),
  body: null,
  bodyUsed: false,
  clone() {
    return this
  },
  formData: () => Promise.resolve(new FormData()),
  headers: new Headers(options.headers || { 'Content-Type': 'application/json' }),
  json: () => Promise.resolve(data),
  ok: options.status ? options.status >= 200 && options.status < 300 : true,
  redirected: false,
  status: options.status || 200,
  statusText: options.statusText || 'OK',
  text: () => Promise.resolve(JSON.stringify(data)),
  type: 'basic',
  url: '',
})

// Add global fetch mock helper
global.mockFetch = (response: unknown, options: MockFetchOptions = {}) => {
  global.fetch = vi.fn().mockResolvedValue(createFetchResponse(response, options))
}

// Add global fetch error mock helper
global.mockFetchError = (errorMessage: string) => {
  global.fetch = vi.fn().mockRejectedValue(new Error(errorMessage))
}

// Add global fetch network error mock helper
global.mockFetchNetworkError = () => {
  global.fetch = vi.fn().mockRejectedValue(new TypeError('Network request failed'))
}

// Add type definitions for the global helpers
declare global {
  var createFetchResponse: (data: unknown, options?: MockFetchOptions) => Response
  var mockFetch: (response: unknown, options?: MockFetchOptions) => void
  var mockFetchError: (errorMessage: string) => void
  var mockFetchNetworkError: () => void
}
