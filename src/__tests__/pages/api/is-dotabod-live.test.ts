import { createMocks } from 'node-mocks-http'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import handler from '@/pages/api/is-dotabod-live'

// Mock the prisma client
vi.mock('@/lib/db', () => ({
  default: {
    user: {
      findFirst: vi.fn(),
    },
  },
}))

// Mock Sentry
vi.mock('@sentry/nextjs', () => ({
  captureException: vi.fn(),
}))

// Mock the withMethods middleware
vi.mock('@/lib/api-middlewares/with-methods', () => ({
  withMethods: (_methods: string[], handler: any) => handler,
}))

import { captureException } from '@sentry/nextjs'
// Import the mocked modules
import prisma from '@/lib/db'

describe('is-dotabod-live API', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('returns 500 for non-GET methods', async () => {
    const { req, res } = createMocks({
      method: 'POST',
    })

    await handler(req, res)

    expect(res.statusCode).toBe(500)
  })

  it('returns true when dotabod is live', async () => {
    const { req, res } = createMocks({
      method: 'GET',
    })

    // Mock the prisma response
    const mockPrismaResponse = { stream_online: true }
    const mockPrismaPromise = Promise.resolve(mockPrismaResponse)
    vi.mocked(prisma.user.findFirst).mockReturnValue(mockPrismaPromise as any)

    await handler(req, res)

    expect(prisma.user.findFirst).toHaveBeenCalledWith({
      select: {
        stream_online: true,
      },
      where: {
        name: 'dotabod',
      },
    })
    expect(res._getJSONData()).toBe(true)
  })

  it('returns false when dotabod is not live', async () => {
    const { req, res } = createMocks({
      method: 'GET',
    })

    // Mock the prisma response
    const mockPrismaResponse = { stream_online: false }
    const mockPrismaPromise = Promise.resolve(mockPrismaResponse)
    vi.mocked(prisma.user.findFirst).mockReturnValue(mockPrismaPromise as any)

    await handler(req, res)

    expect(prisma.user.findFirst).toHaveBeenCalledWith({
      select: {
        stream_online: true,
      },
      where: {
        name: 'dotabod',
      },
    })
    expect(res._getJSONData()).toBe(false)
  })

  it('returns false when dotabod is not found', async () => {
    const { req, res } = createMocks({
      method: 'GET',
    })

    // Mock the prisma response to return null
    const mockPrismaPromise = Promise.resolve(null)
    vi.mocked(prisma.user.findFirst).mockReturnValue(mockPrismaPromise as any)

    await handler(req, res)

    expect(prisma.user.findFirst).toHaveBeenCalledWith({
      select: {
        stream_online: true,
      },
      where: {
        name: 'dotabod',
      },
    })
    expect(res._getJSONData()).toBe(false)
  })

  it('handles database errors correctly', async () => {
    const { req, res } = createMocks({
      method: 'GET',
    })

    // Mock the prisma response to throw an error
    const mockError = new Error('Database error')

    // Use mockRejectedValue instead of mockImplementation
    vi.mocked(prisma.user.findFirst).mockRejectedValueOnce(mockError as any)

    // Need to await to let the promise rejection propagate
    await handler(req, res)

    // Wait for any pending promises to resolve (like the .catch handler)
    await new Promise(process.nextTick)

    expect(prisma.user.findFirst).toHaveBeenCalled()
    // The handler should be passing the error to captureException
    expect(captureException).toHaveBeenCalledTimes(1)
    expect(res.statusCode).toBe(500)
  })
})
