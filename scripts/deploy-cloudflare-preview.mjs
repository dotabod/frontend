import { execFileSync } from 'node:child_process'

import { previewAuthTarget } from './lib/cloudflare-preview-auth.mjs'

const pnpm = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm'
// oxlint-disable-next-line sonarjs/no-os-command-from-path -- SAFETY: pnpm is the repository package manager; arguments are fixed and no shell is used.
const output = execFileSync(pnpm, ['exec', 'wrangler', 'preview', '--json'], {
  encoding: 'utf-8',
  maxBuffer: 10 * 1024 * 1024,
  stdio: ['ignore', 'pipe', 'inherit'],
})
const { name, origin, workerName } = previewAuthTarget(output)

// This creates a new deployment of this Preview only; production and Base secrets are unchanged.
// oxlint-disable-next-line sonarjs/no-os-command-from-path -- SAFETY: pnpm is fixed and validated Cloudflare metadata is passed as separate arguments without a shell.
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
