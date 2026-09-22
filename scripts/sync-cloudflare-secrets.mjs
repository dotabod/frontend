import { execFileSync, spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

import { z } from 'zod'

const manifestSchema = z.object({
  preservedRuntimeSecretKeys: z.array(z.string().min(1)).default([]),
  runtimeSecretKeys: z.array(z.string().min(1)).min(1),
  workerName: z.string().min(1),
})
const dopplerSecretsSchema = z.record(z.string(), z.object({ computed: z.string() }))

const preview = process.argv.includes('--preview')
const { preservedRuntimeSecretKeys, runtimeSecretKeys, workerName } = manifestSchema.parse(
  JSON.parse(readFileSync(new URL('cloudflare-env-manifest.json', import.meta.url), 'utf-8')),
)
const secretNames = preview
  ? [...runtimeSecretKeys, ...preservedRuntimeSecretKeys]
  : runtimeSecretKeys
const dryRun = process.argv.includes('--dry-run')
const dopplerConfigIndex = process.argv.indexOf('--doppler-config')
const dopplerConfig = dopplerConfigIndex === -1 ? undefined : process.argv[dopplerConfigIndex + 1]

if (dopplerConfigIndex !== -1 && (dopplerConfig === undefined || dopplerConfig.length === 0)) {
  throw new Error('--doppler-config requires a config name')
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

const readDopplerSecrets = () => {
  try {
    const args = ['secrets', '--json', '--no-check-version']
    if (dopplerConfig !== undefined && dopplerConfig.length > 0) {
      args.push('--config', dopplerConfig)
    }

    // oxlint-disable-next-line sonarjs/no-os-command-from-path -- SAFETY: Doppler is an explicitly required operator-installed CLI; no user input reaches the command name or arguments.
    const output = execFileSync('doppler', args, {
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
  const target = preview ? 'Worker Preview base config' : 'Worker production config'
  console.log(`Validated ${secretNames.length} Doppler secrets for ${target} ${workerName}:`)
  console.log(secretNames.join('\n'))
  process.exit(0)
}

const pnpm = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm'
const wranglerArgs = preview
  ? ['exec', 'wrangler', 'preview', 'base-config', 'secret', 'bulk', '--worker-name', workerName]
  : ['exec', 'wrangler', 'secret', 'bulk', '--name', workerName]
const result = spawnSync(pnpm, wranglerArgs, {
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

const target = preview ? 'Worker Preview base config' : 'Worker production config'
console.log(`Synced ${secretNames.length} Doppler secrets to ${target} ${workerName}`)
