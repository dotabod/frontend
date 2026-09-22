import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

import { previewAuthTarget } from './lib/cloudflare-preview-auth.mjs'

const pnpm = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm'
const outputDirectory = mkdtempSync(path.join(tmpdir(), 'dotabod-preview-'))
const outputFile = path.join(outputDirectory, 'wrangler.ndjson')
let output = ''
try {
  execFileSync(pnpm, ['exec', 'wrangler', 'preview', '--worker-name', 'frontend'], {
    env: { ...process.env, WRANGLER_OUTPUT_FILE_PATH: outputFile },
    stdio: ['ignore', 'inherit', 'inherit'],
  })
  output = readFileSync(outputFile, 'utf-8')
} finally {
  rmSync(outputDirectory, { force: true, recursive: true })
}
const { name, origin, workerName } = previewAuthTarget(output)

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
