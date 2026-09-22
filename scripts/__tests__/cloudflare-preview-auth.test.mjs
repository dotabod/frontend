import { describe, expect, it } from 'vitest'

import { previewAuthTarget } from '../lib/cloudflare-preview-auth.mjs'

const deployment = (url, workerName = 'frontend') =>
  JSON.stringify({
    deployment_urls: ['https://unique-deployment.example.com'],
    preview_name: 'feature/login',
    preview_urls: [url],
    type: 'preview',
    version: 1,
    worker_name: workerName,
  })

describe('Cloudflare Preview auth origin', () => {
  it('uses the stable branch URL and preserves the exact Preview name', () => {
    expect(
      previewAuthTarget(deployment('https://feature-login-frontend.ketodev.workers.dev/')),
    ).toEqual({
      name: 'feature/login',
      origin: 'https://feature-login-frontend.ketodev.workers.dev',
      workerName: 'frontend',
    })
  })

  it('supports branch custom domains', () => {
    expect(previewAuthTarget(deployment('https://feature-login.dev.dotabod.com')).origin).toBe(
      'https://feature-login.dev.dotabod.com',
    )
  })

  it('reads the final Preview record after Wrangler session metadata', () => {
    const output = `{"type":"wrangler-session","version":1}\n${deployment('https://branch.dev.dotabod.com')}\n`
    expect(previewAuthTarget(output).origin).toBe('https://branch.dev.dotabod.com')
  })

  it('rejects console output and incomplete deployments', () => {
    expect(() => previewAuthTarget('Using redirected Wrangler configuration.')).toThrow()
    expect(() => previewAuthTarget('{"type":"wrangler-session","version":1}\n')).toThrow()
  })

  it.each([
    'https://dev.dotabod.com',
    'https://dotabod.com',
    'https://frontend.ketodev.workers.dev',
    'https://branch-frontend.ketodev.workers.dev.evil.example',
    'https://evil.example',
    // oxlint-disable-next-line sonarjs/no-clear-text-protocols -- SAFETY: negative fixture proves insecure origins are rejected; no network request is made.
    'http://branch.dev.dotabod.com',
    'https://user:password@branch.dev.dotabod.com',
    'https://branch.dev.dotabod.com:444',
    'https://branch.dev.dotabod.com/api/auth',
    'https://branch.dev.dotabod.com?redirect=evil',
    'https://branch.dev.dotabod.com#fragment',
  ])('rejects unsafe or non-preview origin %s', (url) => {
    expect(() => previewAuthTarget(deployment(url))).toThrow()
  })

  it('fails closed for missing metadata and other Workers', () => {
    expect(() => previewAuthTarget('{}')).toThrow()
    expect(() => previewAuthTarget('not json')).toThrow()
    expect(() => previewAuthTarget(deployment('https://branch.dev.dotabod.com', 'other'))).toThrow()
  })
})
