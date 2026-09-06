#!/usr/bin/env node

import { spawn } from 'node:child_process'
import fs from 'node:fs'
import fsp from 'node:fs/promises'
import net from 'node:net'
import os from 'node:os'
import path from 'node:path'

const startedAt = new Date()
const repoRoot = process.cwd()
const runningChildren = new Set()
const temporaryPaths = []
let postgres = null
let cleanupStarted = false

function usage() {
  console.log(`Usage:
  node run-frontend-verification.mjs --verify-command <command> [options]

Options:
  --app-port <port>                 Next server port (default: 3100)
  --cdp-port <port>                 Chromium CDP port (default: 9223)
  --postgres-port <port>            Postgres port (default: 55432)
  --output-dir <path>               Artifact directory
  --check-command <command>         Repeatable preflight command
  --seed-command <command>          Optional feature fixture command
  --verify-command <command>        Required feature browser audit command
  --env NAME=value                  Repeatable environment override
  --skip-database                   Skip isolated Postgres and Prisma push
  --skip-generate                   Skip Prisma client generation
  --skip-build                      Reuse an existing production build
  --skip-axe                        Skip disposable axe-core installation
  --keep-temporaries                Retain temp directories after stopping services
  --axe-version <version>           axe-core version (default: 4.10.3)
  --database-setup-command <cmd>    Prisma/database setup command
  --generate-command <cmd>          Client generation command
  --build-command <cmd>             Production build command
  --start-command <cmd>             Production server command
  --help                            Show this help
`)
}

function parseArgs(argv) {
  const options = {
    appPort: 3100,
    axeVersion: '4.10.3',
    buildCommand: 'pnpm exec next build --webpack',
    cdpPort: 9223,
    checkCommands: [],
    databaseSetupCommand: 'pnpm exec prisma db push --skip-generate',
    env: {},
    generateCommand: 'pnpm generate:all',
    keepTemporaries: false,
    outputDir: 'artifacts/frontend-verification',
    postgresPort: 55432,
    seedCommand: null,
    skipAxe: false,
    skipBuild: false,
    skipDatabase: false,
    skipGenerate: false,
    startCommand: 'pnpm exec next start -p "$FRONTEND_APP_PORT"',
    verifyCommand: null,
  }

  const valueOptions = new Map([
    ['--app-port', 'appPort'],
    ['--axe-version', 'axeVersion'],
    ['--build-command', 'buildCommand'],
    ['--cdp-port', 'cdpPort'],
    ['--database-setup-command', 'databaseSetupCommand'],
    ['--generate-command', 'generateCommand'],
    ['--output-dir', 'outputDir'],
    ['--postgres-port', 'postgresPort'],
    ['--seed-command', 'seedCommand'],
    ['--start-command', 'startCommand'],
    ['--verify-command', 'verifyCommand'],
  ])

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index]
    if (argument === '--help') {
      usage()
      process.exit(0)
    }
    if (argument === '--skip-axe') {options.skipAxe = true}
    else if (argument === '--skip-build') {options.skipBuild = true}
    else if (argument === '--skip-database') {options.skipDatabase = true}
    else if (argument === '--skip-generate') {options.skipGenerate = true}
    else if (argument === '--keep-temporaries') {options.keepTemporaries = true}
    else if (argument === '--check-command') {
      const value = argv[index + 1]
      if (!value) {throw new Error('--check-command requires a value')}
      options.checkCommands.push(value)
      index += 1
    } else if (argument === '--env') {
      const value = argv[index + 1]
      if (!value?.includes('=')) {throw new Error('--env requires NAME=value')}
      const separator = value.indexOf('=')
      const name = value.slice(0, separator)
      if (!/^[A-Z_][A-Z0-9_]*$/.test(name)) {
        throw new Error(`Invalid environment variable name: ${name}`)
      }
      options.env[name] = value.slice(separator + 1)
      index += 1
    } else if (valueOptions.has(argument)) {
      const value = argv[index + 1]
      if (!value) {throw new Error(`${argument} requires a value`)}
      options[valueOptions.get(argument)] = value
      index += 1
    } else {
      throw new Error(`Unknown option: ${argument}`)
    }
  }

  for (const key of ['appPort', 'cdpPort', 'postgresPort']) {
    const value = Number(options[key])
    if (!Number.isInteger(value) || value < 1024 || value > 65535) {
      throw new Error(`${key} must be an integer from 1024 through 65535`)
    }
    options[key] = value
  }

  if (!options.verifyCommand) {throw new Error('--verify-command is required')}
  if (new Set([options.appPort, options.cdpPort, options.postgresPort]).size !== 3) {
    throw new Error('App, CDP, and Postgres ports must be distinct')
  }
  return options
}

function localUrl(raw, label) {
  const parsed = new URL(raw)
  if (!['127.0.0.1', 'localhost', '::1'].includes(parsed.hostname)) {
    throw new Error(`${label} must use a local host; received ${parsed.hostname}`)
  }
  return raw
}

async function portIsFree(port) {
  return new Promise((resolve, reject) => {
    const server = net.createServer()
    server.once('error', (error) => {
      if (error.code === 'EADDRINUSE') {resolve(false)}
      else {reject(error)}
    })
    server.listen(port, '127.0.0.1', () => {
      server.close((error) => (error ? reject(error) : resolve(true)))
    })
  })
}

async function requireFreePort(port, label) {
  if (!(await portIsFree(port))) {
    throw new Error(`${label} port ${port} is already in use; choose another port`)
  }
}

function logPath(outputDir, label) {
  return path.join(outputDir, `${label.replace(/[^a-z0-9-]+/gi, '-').toLowerCase()}.log`)
}

function attachLogs(child, filePath) {
  const stream = fs.createWriteStream(filePath, { flags: 'w' })
  child.stdout?.on('data', (chunk) => {
    process.stdout.write(chunk)
    stream.write(chunk)
  })
  child.stderr?.on('data', (chunk) => {
    process.stderr.write(chunk)
    stream.write(chunk)
  })
  child.once('close', () => stream.end())
}

function trackChild(child) {
  runningChildren.add(child)
  child.once('close', () => runningChildren.delete(child))
  return child
}

function spawnShell(command, env, outputDir, label) {
  console.log(`\n[frontend-verification] ${label}`)
  const child = spawn('/bin/bash', ['-c', command], {
    cwd: repoRoot,
    detached: true,
    env,
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  attachLogs(child, logPath(outputDir, label))
  return trackChild(child)
}

async function runShell(command, env, outputDir, label) {
  const child = spawnShell(command, env, outputDir, label)
  return new Promise((resolve, reject) => {
    child.once('error', reject)
    child.once('exit', (code, signal) => {
      if (code === 0) {resolve()}
      else {reject(new Error(`${label} failed (${signal ?? `exit ${code}`})`))}
    })
  })
}

async function runProcess(command, args, env, outputDir, label) {
  console.log(`\n[frontend-verification] ${label}`)
  const child = spawn(command, args, {
    cwd: repoRoot,
    env,
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  attachLogs(child, logPath(outputDir, label))
  trackChild(child)
  return new Promise((resolve, reject) => {
    child.once('error', reject)
    child.once('exit', (code, signal) => {
      if (code === 0) {resolve()}
      else {reject(new Error(`${label} failed (${signal ?? `exit ${code}`})`))}
    })
  })
}

async function waitForUrl(url, label, attempts = 120) {
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(url)
      await response.body?.cancel()
      console.log(`[frontend-verification] ${label} ready at ${url}`)
      return
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 500))
    }
  }
  throw new Error(`Timed out waiting for ${label} at ${url}`)
}

async function findPostgresBin() {
  if (process.env.POSTGRES_BIN) {return process.env.POSTGRES_BIN}
  const root = '/usr/lib/postgresql'
  const versions = await fsp.readdir(root).catch(() => [])
  versions.sort((left, right) => right.localeCompare(left, undefined, { numeric: true }))
  for (const version of versions) {
    const candidate = path.join(root, version, 'bin')
    try {
      await Promise.all([
        fsp.access(path.join(candidate, 'initdb'), fs.constants.X_OK),
        fsp.access(path.join(candidate, 'pg_ctl'), fs.constants.X_OK),
      ])
      return candidate
    } catch {}
  }
  throw new Error('Postgres initdb/pg_ctl not found; set POSTGRES_BIN')
}

async function findChromium() {
  const candidates = [
    process.env.CHROMIUM_BIN,
    '/snap/bin/chromium',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
  ].filter(Boolean)
  for (const candidate of candidates) {
    try {
      await fsp.access(candidate, fs.constants.X_OK)
      return candidate
    } catch {}
  }
  throw new Error('Chromium not found; set CHROMIUM_BIN')
}

function killProcessGroup(child, signal) {
  if (!child?.pid || child.exitCode !== null || child.signalCode !== null) {return}
  try {
    process.kill(-child.pid, signal)
  } catch (error) {
    if (error.code !== 'ESRCH') {throw error}
  }
}

async function stopChild(child) {
  if (!child?.pid || child.exitCode !== null || child.signalCode !== null) {return}
  killProcessGroup(child, 'SIGTERM')
  await Promise.race([
    new Promise((resolve) => child.once('exit', resolve)),
    new Promise((resolve) => setTimeout(resolve, 5000)),
  ])
  if (child.exitCode === null && child.signalCode === null) {killProcessGroup(child, 'SIGKILL')}
}

async function restoreGeneratedNextEnv(snapshot) {
  if (snapshot === null) {return}
  const filePath = path.join(repoRoot, 'next-env.d.ts')
  const current = await fsp.readFile(filePath, 'utf8').catch(() => null)
  if (current === snapshot) {return}
  const normalized = current?.replace(
    'import "./.next/types/routes.d.ts";',
    'import "./.next/dev/types/routes.d.ts";',
  )
  if (normalized === snapshot) {
    await fsp.writeFile(filePath, snapshot)
    console.log('[frontend-verification] restored generated next-env.d.ts route import')
  } else {
    console.warn(
      '[frontend-verification] next-env.d.ts changed beyond the known generated route import; left untouched',
    )
  }
}

async function cleanup(options, nextEnvSnapshot) {
  if (cleanupStarted) {return}
  cleanupStarted = true
  for (const child of [...runningChildren].reverse()) {await stopChild(child)}
  if (postgres) {
    await runProcess(
      path.join(postgres.bin, 'pg_ctl'),
      ['-D', postgres.dataDir, '-w', 'stop'],
      process.env,
      options.outputDir,
      'stop-postgres',
    ).catch((error) => console.warn(`[frontend-verification] ${error.message}`))
  }
  await restoreGeneratedNextEnv(nextEnvSnapshot)
  if (!options.keepTemporaries) {
    for (const temporaryPath of temporaryPaths.reverse()) {
      await fsp.rm(temporaryPath, { force: true, recursive: true })
    }
  } else if (temporaryPaths.length > 0) {
    console.log(`[frontend-verification] retained temporary paths:\n${temporaryPaths.join('\n')}`)
  }
}

function installSignalHandlers(options, nextEnvSnapshot) {
  for (const signal of ['SIGINT', 'SIGTERM']) {
    process.once(signal, async () => {
      console.warn(`[frontend-verification] received ${signal}; cleaning up`)
      await cleanup(options, nextEnvSnapshot)
      process.exit(signal === 'SIGINT' ? 130 : 143)
    })
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2))
  options.outputDir = path.resolve(repoRoot, options.outputDir)
  await fsp.mkdir(options.outputDir, { recursive: true })

  const portChecks = [
    requireFreePort(options.appPort, 'App'),
    requireFreePort(options.cdpPort, 'CDP'),
  ]
  if (!options.skipDatabase) {
    portChecks.push(requireFreePort(options.postgresPort, 'Postgres'))
  }
  await Promise.all(portChecks)

  if (!options.skipDatabase && ('DATABASE_URL' in options.env || 'DIRECT_URL' in options.env)) {
    throw new Error(
      'DATABASE_URL and DIRECT_URL cannot be overridden while isolated Postgres is enabled',
    )
  }

  const databaseUrl = localUrl(
    options.env.DATABASE_URL ?? `postgresql://postgres@127.0.0.1:${options.postgresPort}/postgres`,
    'DATABASE_URL',
  )
  const directUrl = localUrl(options.env.DIRECT_URL ?? databaseUrl, 'DIRECT_URL')
  const baseUrl = `http://127.0.0.1:${options.appPort}`
  const cdpUrl = `http://127.0.0.1:${options.cdpPort}`
  const env = {
    ...process.env,
    DATABASE_URL: databaseUrl,
    DIRECT_URL: directUrl,
    IS_IN_MAINTENANCE_MODE: 'false',
    MONGO_URL: 'mongodb://127.0.0.1:27017/dotabod',
    NEXT_TELEMETRY_DISABLED: '1',
    NEXTAUTH_SECRET: 'frontend-verification-local-secret',
    NEXTAUTH_URL: baseUrl,
    OPENNODE_API_KEY: 'dummy-opennode-key',
    STRIPE_SECRET_KEY: 'sk_test_dummy',
    TWITCH_CLIENT_ID: 'dummy-client-id',
    TWITCH_CLIENT_SECRET: 'dummy-client-secret',
    ...options.env,
    FRONTEND_APP_PORT: String(options.appPort),
    FRONTEND_BASE_URL: baseUrl,
    FRONTEND_CDP_PORT: String(options.cdpPort),
    FRONTEND_CDP_URL: cdpUrl,
    FRONTEND_OUTPUT_DIR: options.outputDir,
    FRONTEND_POSTGRES_PORT: String(options.postgresPort),
  }
  env.DATABASE_URL = databaseUrl
  env.DIRECT_URL = directUrl

  const nextEnvPath = path.join(repoRoot, 'next-env.d.ts')
  const nextEnvSnapshot = await fsp.readFile(nextEnvPath, 'utf8').catch(() => null)
  installSignalHandlers(options, nextEnvSnapshot)

  const report = {
    appPort: options.appPort,
    axeVersion: options.skipAxe ? null : options.axeVersion,
    cdpPort: options.cdpPort,
    completedAt: null,
    durationMs: null,
    environmentOverrides: Object.keys(options.env).sort(),
    outputDir: options.outputDir,
    postgresPort: options.skipDatabase ? null : options.postgresPort,
    startedAt: startedAt.toISOString(),
    status: 'running',
    temporaryPaths: options.keepTemporaries ? temporaryPaths : undefined,
  }

  let failure = null
  try {
    for (const [index, command] of options.checkCommands.entries()) {
      await runShell(command, env, options.outputDir, `check-${index + 1}`)
    }

    if (!options.skipDatabase) {
      const postgresBin = await findPostgresBin()
      const dataDir = await fsp.mkdtemp(path.join(os.tmpdir(), 'dotabod-frontend-pg-'))
      temporaryPaths.push(dataDir)
      postgres = { bin: postgresBin, dataDir }
      await runProcess(
        path.join(postgresBin, 'initdb'),
        ['-D', dataDir, '--auth=trust', '--username=postgres'],
        env,
        options.outputDir,
        'init-postgres',
      )
      await runProcess(
        path.join(postgresBin, 'pg_ctl'),
        [
          '-D',
          dataDir,
          '-l',
          logPath(options.outputDir, 'postgres'),
          '-o',
          `-p ${options.postgresPort} -h 127.0.0.1 -k /tmp`,
          '-w',
          'start',
        ],
        env,
        options.outputDir,
        'start-postgres',
      )
    }

    if (!options.skipGenerate) {
      await runShell(options.generateCommand, env, options.outputDir, 'generate-clients')
    }
    if (!options.skipDatabase && options.databaseSetupCommand) {
      await runShell(options.databaseSetupCommand, env, options.outputDir, 'database-setup')
    }
    if (options.seedCommand) {
      await runShell(options.seedCommand, env, options.outputDir, 'feature-seed')
    }
    if (!options.skipBuild) {
      await runShell(options.buildCommand, env, options.outputDir, 'production-build')
    }

    spawnShell(options.startCommand, env, options.outputDir, 'production-server')
    await waitForUrl(baseUrl, 'Next production server')

    const chromiumBin = await findChromium()
    const chromiumDir = await fsp.mkdtemp(path.join(os.tmpdir(), 'dotabod-frontend-cdp-'))
    temporaryPaths.push(chromiumDir)
    const chromium = spawn(
      chromiumBin,
      [
        '--headless=new',
        '--no-sandbox',
        '--disable-gpu',
        '--enable-unsafe-swiftshader',
        '--hide-scrollbars',
        '--log-level=3',
        `--remote-debugging-port=${options.cdpPort}`,
        `--user-data-dir=${chromiumDir}`,
        'about:blank',
      ],
      {
        cwd: repoRoot,
        detached: true,
        env,
        stdio: ['ignore', 'pipe', 'pipe'],
      },
    )
    attachLogs(chromium, logPath(options.outputDir, 'chromium'))
    trackChild(chromium)
    await waitForUrl(`${cdpUrl}/json/version`, 'Chromium CDP')

    if (!options.skipAxe) {
      const axeDir = await fsp.mkdtemp(path.join(os.tmpdir(), 'dotabod-frontend-axe-'))
      temporaryPaths.push(axeDir)
      await runProcess(
        'pnpm',
        ['add', '--dir', axeDir, '--ignore-scripts', `axe-core@${options.axeVersion}`],
        env,
        options.outputDir,
        'install-axe',
      )
      env.FRONTEND_AXE_SCRIPT = path.join(axeDir, 'node_modules', 'axe-core', 'axe.min.js')
    } else {
      env.FRONTEND_AXE_SCRIPT = ''
    }

    await runShell(options.verifyCommand, env, options.outputDir, 'feature-verification')
    report.status = 'passed'
  } catch (error) {
    failure = error
    report.status = 'failed'
    report.error = error instanceof Error ? error.message : String(error)
  } finally {
    report.completedAt = new Date().toISOString()
    report.durationMs = new Date(report.completedAt).getTime() - startedAt.getTime()
    if (options.keepTemporaries) {report.temporaryPaths = [...temporaryPaths]}
    await fsp.writeFile(
      path.join(options.outputDir, 'frontend-verification-report.json'),
      `${JSON.stringify(report, null, 2)}\n`,
    )
    await cleanup(options, nextEnvSnapshot)
  }

  if (failure) {throw failure}
  console.log(`\n[frontend-verification] passed; artifacts: ${options.outputDir}`)
}

main().catch((error) => {
  console.error(`\n[frontend-verification] ${error.stack ?? error}`)
  process.exitCode = 1
})
