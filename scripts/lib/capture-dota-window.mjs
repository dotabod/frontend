/* oxlint-disable typescript/no-unsafe-argument, typescript/no-unsafe-assignment, typescript/no-unsafe-call, typescript/no-unsafe-member-access, typescript/no-unsafe-return, typescript/strict-boolean-expressions, typescript/strict-void-return -- This Node-only MJS boundary consumes execFile errors and JSON emitted by the owned PowerShell script; TypeScript 7 cannot infer those runtime shapes. */
import { execFile } from 'node:child_process'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'

const run = promisify(execFile)

const CAPTURE_SCRIPT = fileURLToPath(new URL('../capture-dota-window.ps1', import.meta.url))

// Windows PowerShell ships on every Windows box; pwsh is the cross-platform
// build a developer may have installed instead. Either can run the capture.
const POWERSHELL_CANDIDATES = ['powershell.exe', 'pwsh.exe', 'pwsh']

const isMissingExecutable = (error) => error?.code === 'ENOENT'

/**
 * Screenshots the running Dota 2 client as a 1920x1080 PNG.
 *
 * Returns the capture metadata reported by the PowerShell script, including the
 * installed client's Steam build id so the overlay manifest can record which
 * version of the menu art the image was taken from.
 */
export const captureDotaWindow = async ({ output, settleMs }) => {
  if (process.platform !== 'win32') {
    throw new Error(
      'Capturing the Dota 2 client only works on Windows. Run this on the machine with the game installed.',
    )
  }

  const args = [
    '-NoProfile',
    '-ExecutionPolicy',
    'Bypass',
    '-File',
    CAPTURE_SCRIPT,
    '-Output',
    output,
  ]
  if (settleMs !== undefined) {
    args.push('-SettleMs', String(settleMs))
  }

  let lastError
  for (const shell of POWERSHELL_CANDIDATES) {
    try {
      // oxlint-disable-next-line eslint/no-await-in-loop -- candidates must run sequentially so a missing executable can fall through without launching multiple captures
      const { stdout } = await run(shell, args, { windowsHide: true })
      return JSON.parse(stdout.trim())
    } catch (error) {
      if (isMissingExecutable(error)) {
        lastError = error
        continue
      }
      // PowerShell writes `throw` messages to stderr; they are already written
      // for a human, so surface them instead of the generic exec failure.
      const detail = String(error.stderr ?? '').trim()
      throw new Error(detail || error.message, { cause: error })
    }
  }

  throw lastError ?? new Error('Could not find PowerShell to run the capture.')
}

/**
 * Captures into a throwaway directory and cleans it up afterwards, unless the
 * caller wants to keep the full frame around to debug a bad crop.
 */
export const withCapturedFrame = async ({ keepFrameAt, settleMs }, consume) => {
  const directory = keepFrameAt ? null : await mkdtemp(path.join(tmpdir(), 'dotabod-capture-'))
  const output = keepFrameAt ?? path.join(directory, 'dota-frame.png')

  try {
    return await consume(await captureDotaWindow({ output, settleMs }))
  } finally {
    if (directory) {
      await rm(directory, { force: true, recursive: true })
    }
  }
}
