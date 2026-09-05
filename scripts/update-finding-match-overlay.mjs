#!/usr/bin/env node

import { parseArgs } from 'node:util'
import { readFile } from 'node:fs/promises'
import {
  generateFindingMatchOverlay,
  processCapturedScreenshot,
} from './lib/finding-match-overlay.mjs'

const { values } = parseArgs({
  allowPositionals: false,
  options: {
    input: { short: 'i', type: 'string' },
    'build-id': { type: 'string' },
    output: { short: 'o', type: 'string' },
    'output-dir': { type: 'string' },
    'source-metadata': { type: 'string' },
    state: { default: 'auto', type: 'string' },
  },
})

if (!values.input || (!values.output && !values['output-dir'])) {
  console.error(
    'Usage: node scripts/update-finding-match-overlay.mjs --input <1920x1080 screenshot> (--output <png> [--state auto|finding|idle] | --output-dir <directory> --build-id <id>)',
  )
  process.exit(2)
}

try {
  const sourceMetadata = values['source-metadata']
    ? {
        ...JSON.parse(await readFile(values['source-metadata'], 'utf8')),
        type: 'twitch',
      }
    : undefined
  const result = values['output-dir']
    ? await processCapturedScreenshot({
        buildId: values['build-id'] ?? 'unknown',
        capturedAt: sourceMetadata?.capturedAt,
        input: values.input,
        outputDirectory: values['output-dir'],
        source: sourceMetadata,
      })
    : await generateFindingMatchOverlay({
        input: values.input,
        output: values.output,
        state: values.state,
      })
  console.log(`Wrote ${result.state} overlay to ${result.output}`)
} catch (error) {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
}
