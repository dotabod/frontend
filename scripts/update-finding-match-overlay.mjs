#!/usr/bin/env node

// Refreshes the queue-blocker art the overlay draws over a streamer's main menu.
//
// With no arguments it screenshots the Dota 2 client running on this machine,
// works out which queue state the menu is in, and overwrites the matching
// asset. Point it at --input instead to reprocess a screenshot you already have.
//
//   node scripts/update-finding-match-overlay.mjs              # live client
//   node scripts/update-finding-match-overlay.mjs -i frame.png # existing frame

import { parseArgs } from 'node:util'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
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
                         Accepts a 16:9 client screenshot or an existing 840x355 crop.
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

if (values.help) {
  console.log(USAGE)
  process.exit(0)
}

const describe = ({ output, state }) =>
  `Wrote the ${state} overlay to ${path.relative(process.cwd(), output) || output}`

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
  const result = await processCapturedScreenshot({
    buildId: values['build-id'] ?? buildId ?? 'unknown',
    input,
    outputDirectory: values['output-dir'] ?? DEFAULT_OUTPUT_DIRECTORY,
    source: nativeResolution ? { nativeResolution } : undefined,
  })
  console.log(describe(result))
  console.log(`Recorded the capture in ${path.relative(process.cwd(), result.manifestPath)}`)
}

try {
  if (values.input) {
    await (values.output
      ? writeSingleFile(values.input)
      : writeRoutedAsset(values.input, { buildId: values['build-id'] }))
  } else {
    await withCapturedFrame(
      {
        keepFrameAt: values['keep-frame'],
        settleMs: values['settle-ms'] ? Number(values['settle-ms']) : undefined,
      },
      async (capture) => {
        console.log(`Captured the ${capture.sourceSize} client as ${capture.resolution}`)
        await (values.output
          ? writeSingleFile(capture.output)
          : writeRoutedAsset(capture.output, {
              buildId: capture.buildId,
              // Only worth recording when the frame was actually resampled.
              nativeResolution:
                capture.sourceSize === capture.resolution ? undefined : capture.sourceSize,
            }))
      },
    )
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
}
