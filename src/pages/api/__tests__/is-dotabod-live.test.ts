import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createMocks } from 'node-mocks-http'
import handler from '../is-dotabod-live'

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

// Import the mocked modules
import prisma from '@/lib/db'
import { captureException } from '@sentry/nextjs'

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

    // Create a mock implementation that calls the catch handler
    vi.mocked(prisma.user.findFirst).mockImplementation(() => {
      return {
        then: () => {
          return {
            catch: (callback) => {
              callback(mockError)
              return undefined
            },
          }
        },
      } as any
    })

    await handler(req, res)

    expect(prisma.user.findFirst).toHaveBeenCalled()
    expect(captureException).toHaveBeenCalledWith(mockError)
    expect(res.statusCode).toBe(500)
  })
})
