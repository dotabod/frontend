#!/usr/bin/env node

/* oxlint-disable typescript/consistent-return, typescript/no-unsafe-argument, typescript/no-unsafe-assignment, typescript/no-unsafe-member-access -- node:util parseArgs values are runtime-validated at each CLI boundary, but TypeScript 7 treats them as any in this MJS script. */

// Refreshes the queue-blocker art the overlay draws over a streamer's main menu.
//
// With no arguments it screenshots the Dota 2 client running on this machine,
// works out which queue state the menu is in, and overwrites the matching
// asset. Point it at --input instead to reprocess a screenshot you already have.
//
//   node scripts/update-finding-match-overlay.mjs              # live client
//   node scripts/update-finding-match-overlay.mjs -i frame.png # existing frame

import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseArgs } from 'node:util'

import { withCapturedFrame } from './lib/capture-dota-window.mjs'
import {
  generateFindingMatchOverlay,
  processCapturedScreenshot,
} from './lib/finding-match-overlay.mjs'

const REPO_ROOT = fileURLToPath(new URL('..', import.meta.url))
const DEFAULT_OUTPUT_DIRECTORY = path.join(REPO_ROOT, 'public', 'images', 'overlay')

const USAGE = `Usage: node scripts/update-finding-match-overlay.mjs [options]

  Captures the Dota 2 client running on this machine and refreshes the queue
  blocker art. Whichever queue state the menu is in decides which file is
  written: the client sitting on the main menu updates finding-match-old.png,
  and the client searching for a match updates finding-match.png.

Options:
  -i, --input <png>      Process this screenshot instead of capturing the client.
                         Accepts a 1920x1080 screenshot or an existing 840x355 crop.
  -o, --output <png>     Write one specific file instead of routing by state.
      --output-dir <dir> Directory holding the overlay assets.
                         [default: public/images/overlay]
      --state <state>    auto | finding | idle. Only used with --output. [default: auto]
      --build-id <id>    Override the Steam build id recorded in the manifest.
      --keep-frame <png> Keep the full captured frame here for debugging a bad crop.
      --settle-ms <ms>   Wait this long after focusing the client before capturing.
`

const { values } = parseArgs({
  allowPositionals: false,
  options: {
    'build-id': { type: 'string' },
    help: { short: 'h', type: 'boolean' },
    input: { short: 'i', type: 'string' },
    'keep-frame': { type: 'string' },
    output: { short: 'o', type: 'string' },
    'output-dir': { type: 'string' },
    'settle-ms': { type: 'string' },
    state: { default: 'auto', type: 'string' },
  },
})

if (values.help === true) {
  console.log(USAGE)
  process.exit(0)
}

const describe = ({ output, state }) =>
  `Wrote the ${state} overlay to ${path.relative(process.cwd(), output) || output}`

const parseSettleMs = () => {
  if (values['settle-ms'] === undefined) {
    return
  }

  const settleMs = Number(values['settle-ms'])
  if (!Number.isInteger(settleMs) || settleMs < 0) {
    throw new Error('--settle-ms must be a non-negative integer')
  }
  return settleMs
}

// --output asks for one specific file, so the state routing and the manifest
// bookkeeping are both skipped.
const writeSingleFile = async (input) => {
  const result = await generateFindingMatchOverlay({
    input,
    output: values.output,
    state: values.state,
  })
  console.log(describe(result))
}

const writeRoutedAsset = async (input, { buildId, nativeResolution }) => {
  const source = nativeResolution === undefined ? undefined : { nativeResolution }
  const result = await processCapturedScreenshot({
    buildId: values['build-id'] ?? buildId ?? 'unknown',
    input,
    outputDirectory: values['output-dir'] ?? DEFAULT_OUTPUT_DIRECTORY,
    source,
  })
  console.log(describe(result))
  console.log(`Recorded the capture in ${path.relative(process.cwd(), result.manifestPath)}`)
}

try {
  const settleMs = parseSettleMs()
  if (values.input === undefined) {
    await withCapturedFrame(
      {
        keepFrameAt: values['keep-frame'],
        settleMs,
      },
      async (capture) => {
        console.log(`Captured the ${capture.sourceSize} client as ${capture.resolution}`)
        await (values.output === undefined
          ? writeRoutedAsset(capture.output, {
              buildId: capture.buildId,
              // Only worth recording when the frame was actually resampled.
              nativeResolution:
                capture.sourceSize === capture.resolution ? undefined : capture.sourceSize,
            })
          : writeSingleFile(capture.output))
      },
    )
  } else if (values.output === undefined) {
    await writeRoutedAsset(values.input, { buildId: values['build-id'] })
  } else {
    await writeSingleFile(values.input)
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
}
