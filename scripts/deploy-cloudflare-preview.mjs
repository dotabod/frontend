import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { previewAuthTarget } from './lib/cloudflare-preview-auth.mjs'

const pnpm = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm'
const outputDirectory = mkdtempSync(join(tmpdir(), 'dotabod-preview-'))
const outputFile = join(outputDirectory, 'wrangler.ndjson')
let target
try {
  execFileSync(pnpm, ['exec', 'wrangler', 'preview'], {
    env: { ...process.env, WRANGLER_OUTPUT_FILE_PATH: outputFile },
    stdio: ['ignore', 'inherit', 'inherit'],
  })
  target = previewAuthTarget(readFileSync(outputFile, 'utf-8'))
} finally {
  rmSync(outputDirectory, { force: true, recursive: true })
}
const { name, origin, workerName } = target

// This creates a new deployment of this Preview only; production and Base secrets are unchanged.
execFileSync(
  pnpm,
  [
    'exec',
    'wrangler',
    'preview',
    'secret',
    'put',
    'NEXTAUTH_URL',
    '--worker-name',
    workerName,
    '--name',
    name,
  ],
  { input: origin, stdio: ['pipe', 'inherit', 'inherit'] },
)

console.log(`Preview NEXTAUTH_URL: ${origin}`)
console.log(`Register this Twitch OAuth callback: ${origin}/api/auth/callback/twitch`)
