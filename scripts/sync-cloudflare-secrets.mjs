import { execFileSync, spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

const manifest = JSON.parse(
  readFileSync(new URL('./cloudflare-env-manifest.json', import.meta.url), 'utf8'),
)
const dryRun = process.argv.includes('--dry-run')
const workerName = manifest.workerName
const secretNames = manifest.runtimeSecretKeys

if (!workerName || !Array.isArray(secretNames) || secretNames.length === 0) {
  throw new Error('Cloudflare environment manifest is missing its Worker name or runtime secrets')
}

const uniqueSecretNames = [...new Set(secretNames)]
if (uniqueSecretNames.length !== secretNames.length) {
  throw new Error('Cloudflare runtime secret allowlist contains duplicate names')
}

const unsafeNames = secretNames.filter(
  (name) => name.startsWith('DOPPLER_') || name.startsWith('NEXT_PUBLIC_'),
)
if (unsafeNames.length > 0) {
  throw new Error(
    `Build-only or Doppler metadata keys cannot be Worker secrets: ${unsafeNames.join(', ')}`,
  )
}

let dopplerSecrets
try {
  const output = execFileSync('doppler', ['secrets', '--json', '--no-check-version'], {
    encoding: 'utf8',
    maxBuffer: 10 * 1024 * 1024,
  })
  dopplerSecrets = JSON.parse(output)
} catch {
  throw new Error('Could not read the configured Doppler project and config')
}

const missingSecrets = secretNames.filter((name) => {
  const value = dopplerSecrets[name]?.computed
  return typeof value !== 'string' || value.length === 0
})

if (missingSecrets.length > 0) {
  throw new Error(`Required Doppler secrets are missing or empty: ${missingSecrets.join(', ')}`)
}

if (dryRun) {
  console.log(`Validated ${secretNames.length} Doppler secrets for Worker ${workerName}:`)
  console.log(secretNames.join('\n'))
  process.exit(0)
}

const payload = Object.fromEntries(secretNames.map((name) => [name, dopplerSecrets[name].computed]))
const pnpm = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm'
const result = spawnSync(pnpm, ['exec', 'wrangler', 'secret', 'bulk', '--name', workerName], {
  encoding: 'utf8',
  input: JSON.stringify(payload),
  stdio: ['pipe', 'inherit', 'inherit'],
})

if (result.error) {
  throw result.error
}
if (result.status !== 0) {
  process.exit(result.status ?? 1)
}

console.log(`Synced ${secretNames.length} Doppler secrets to Worker ${workerName}`)
