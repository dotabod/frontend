import handler from '@/pages/api/languages'
import { createMocks } from 'node-mocks-http'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Mock fetch
global.fetch = vi.fn()

// Mock Sentry
vi.mock('@sentry/nextjs', () => ({
  captureException: vi.fn(),
}))

// Import the mocked modules
import { captureException } from '@sentry/nextjs'

// Mock environment variables
beforeEach(() => {
  vi.stubEnv('CROWDIN_TOKEN', 'mock-token')
})
afterEach(() => {
  vi.unstubAllEnvs()
})

describe('languages API', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('fetches language progress successfully', async () => {
    const mockResponse = {
      data: [
        {
          data: {
            translationProgress: 75,
            approvalProgress: 50,
          },
        },
      ],
    }

    // Mock successful fetch response
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    })

    const { req, res } = createMocks({
      method: 'GET',
      query: {
        projectId: 'test-project',
        languageId: 'test-language',
      },
    })

    await handler(req, res)

    // Verify fetch was called with correct parameters
    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.crowdin.com/api/v2/projects/test-project/languages/test-language/progress?limit=1&offset=0',
      {
        headers: {
          Authorization: 'Bearer mock-token',
        },
      },
    )

    // Verify response
    expect(res.statusCode).toBe(200)
    expect(res._getJSONData()).toEqual({
      translationProgress: 75,
      approvalProgress: 50,
    })
  })

  it('handles fetch errors correctly', async () => {
    const mockError = new Error('Fetch error')

    // Mock failed fetch response
    global.fetch = vi.fn().mockRejectedValueOnce(mockError)

    const { req, res } = createMocks({
      method: 'GET',
      query: {
        projectId: 'test-project',
        languageId: 'test-language',
      },
    })

    await handler(req, res)

    // Verify error handling
    expect(captureException).toHaveBeenCalledWith(mockError)
    expect(res.statusCode).toBe(500)
    expect(res._getJSONData()).toEqual({ error: 'Fetch error' })
  })

  it('handles non-OK fetch responses correctly', async () => {
    // Mock non-OK fetch response
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 404,
    })

    const { req, res } = createMocks({
      method: 'GET',
      query: {
        projectId: 'test-project',
        languageId: 'test-language',
      },
    })

    await handler(req, res)

    // Verify error handling
    expect(captureException).toHaveBeenCalled()
    expect(res.statusCode).toBe(500)
    expect(res._getJSONData()).toEqual({
      error: 'Failed to fetch Crowdin language progress. Status: 404',
    })
  })

  it('handles missing query parameters', async () => {
    const { req, res } = createMocks({
      method: 'GET',
      query: {
        // Missing projectId and languageId
      },
    })

    await handler(req, res)

    // Verify error handling
    expect(captureException).toHaveBeenCalled()
    expect(res.statusCode).toBe(500)
  })
})
