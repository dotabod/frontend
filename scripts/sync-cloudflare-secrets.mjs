import { execFileSync, spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

import { z } from 'zod'

const manifestSchema = z.object({
  runtimeSecretKeys: z.array(z.string().min(1)).min(1),
  workerName: z.string().min(1),
})
const dopplerSecretsSchema = z.record(z.string(), z.object({ computed: z.string() }))

const { runtimeSecretKeys: secretNames, workerName } = manifestSchema.parse(
  JSON.parse(readFileSync(new URL('cloudflare-env-manifest.json', import.meta.url), 'utf-8')),
)
const dryRun = process.argv.includes('--dry-run')

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

const readDopplerSecrets = () => {
  try {
    // oxlint-disable-next-line sonarjs/no-os-command-from-path -- SAFETY: Doppler is an explicitly required operator-installed CLI; no user input reaches the command name or arguments.
    const output = execFileSync('doppler', ['secrets', '--json', '--no-check-version'], {
      encoding: 'utf-8',
      maxBuffer: 10 * 1024 * 1024,
    })
    return dopplerSecretsSchema.parse(JSON.parse(output))
  } catch {
    throw new Error('Could not read the configured Doppler project and config')
  }
}

const dopplerSecrets = readDopplerSecrets()

const missingSecrets = []
/** @type {Record<string, string>} */
const payload = {}
for (const name of secretNames) {
  const value = dopplerSecrets[name]?.computed
  if (value === undefined || value.length === 0) {
    missingSecrets.push(name)
  } else {
    payload[name] = value
  }
}

if (missingSecrets.length > 0) {
  throw new Error(`Required Doppler secrets are missing or empty: ${missingSecrets.join(', ')}`)
}

if (dryRun) {
  console.log(`Validated ${secretNames.length} Doppler secrets for Worker ${workerName}:`)
  console.log(secretNames.join('\n'))
  process.exit(0)
}

const pnpm = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm'
const result = spawnSync(pnpm, ['exec', 'wrangler', 'secret', 'bulk', '--name', workerName], {
  encoding: 'utf-8',
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
