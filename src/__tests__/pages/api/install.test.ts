import type { NextApiHandler } from 'next'
import { createMocks } from 'node-mocks-http'
import { describe, expect, it, vi } from 'vitest'
import handler from '@/pages/api/install'

vi.mock('@/lib/api-middlewares/with-methods', () => ({
  withMethods: (_methods: string[], wrappedHandler: NextApiHandler) => wrappedHandler,
}))

describe('install API', () => {
  it('serves the installer script with basic parsing enabled and current host replacements', async () => {
    const { req, res } = createMocks({
      method: 'GET',
      headers: {
        host: 'example.com',
      },
    })

    await handler(req, res)

    expect(res.statusCode).toBe(200)
    expect(res._getHeaders()['content-type']).toBe('application/octet-stream')
    expect(res._getHeaders()['content-disposition']).toBe('attachment; filename=install.ps1')

    const body = res._getData() as string

    expect(body).toContain('Invoke-WebRequest -UseBasicParsing -Uri $Url -TimeoutSec 5')
    expect(body).toContain('Invoke-WebRequest -UseBasicParsing -Uri $fileUrl -Method Head')
    expect(body).toContain('Invoke-WebRequest -UseBasicParsing -Uri $fileUrl -Method Get')
    expect(body).toContain('https://example.com')
    expect(body).not.toContain('https://dotabod.com/api/install/$Token')
  })
})
