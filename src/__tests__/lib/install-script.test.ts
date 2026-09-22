import { describe, expect, it } from 'vitest'

import { createInstallResponse } from '@/lib/install-script'
import installScript from '@/lib/private/install.ps1?raw'

describe('Cloudflare installation script', () => {
  it('serves the bundled script with the request host and download headers', async () => {
    const response = createInstallResponse(
      new Request('https://preview.dotabod.com/api/install'),
      installScript,
    )

    expect(response.status).toBe(200)
    expect(response.headers.get('Content-Type')).toBe('application/octet-stream')
    expect(response.headers.get('Content-Disposition')).toBe('attachment; filename=install.ps1')
    expect(response.headers.get('Cache-Control')).toBe(
      'private, no-cache, no-store, must-revalidate',
    )
    await expect(response.text()).resolves.toBe(
      installScript.replaceAll('/dotabod.com', '/preview.dotabod.com'),
    )
  })
})
