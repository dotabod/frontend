import '@testing-library/jest-dom'
import React from 'react'
import { vi } from 'vitest'

// Mock the framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) =>
      React.createElement('div', props, children),
  },
  AnimatePresence: ({ children }: React.PropsWithChildren) => children,
}))

// Mock the Prisma Mongo client
vi.mock('.prisma-mongo/client', () => {
  const mockPrismaMongoClient = vi.fn(() => ({
    $disconnect: vi.fn().mockResolvedValue(undefined),
    cards: {
      findUnique: vi.fn().mockResolvedValue({ id: 'mock-card-id' }),
    },
    notablePlayers: {
      findUnique: vi.fn().mockResolvedValue({ id: 'mock-player-id' }),
    },
    // Add other methods as needed
  }))

  return {
    PrismaClient: mockPrismaMongoClient,
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
global.createFetchResponse = (data: unknown, options: MockFetchOptions = {}) => {
  return {
    ok: options.status ? options.status >= 200 && options.status < 300 : true,
    status: options.status || 200,
    statusText: options.statusText || 'OK',
    headers: new Headers(options.headers || { 'Content-Type': 'application/json' }),
    json: () => Promise.resolve(data),
    text: () => Promise.resolve(JSON.stringify(data)),
    redirected: false,
    type: 'basic',
    url: '',
    clone: function () {
      return this
    },
    body: null,
    bodyUsed: false,
    arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
    blob: () => Promise.resolve(new Blob([])),
    formData: () => Promise.resolve(new FormData()),
  } as Response
}

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
  // eslint-disable-next-line no-var
  var createFetchResponse: (data: unknown, options?: MockFetchOptions) => Response
  // eslint-disable-next-line no-var
  var mockFetch: (response: unknown, options?: MockFetchOptions) => void
  // eslint-disable-next-line no-var
  var mockFetchError: (errorMessage: string) => void
  // eslint-disable-next-line no-var
  var mockFetchNetworkError: () => void
}
