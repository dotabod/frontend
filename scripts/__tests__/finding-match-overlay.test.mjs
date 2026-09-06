/* oxlint-disable sonarjs/expression-complexity, sonarjs/no-duplicate-string, typescript/no-unsafe-argument, typescript/no-unsafe-assignment, typescript/no-unsafe-call, typescript/no-unsafe-member-access, typescript/strict-void-return -- These MJS integration fixtures intentionally use literal pixel bounds and Node error shapes so their expectations stay independent of production helpers. */
import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { mkdtemp, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { promisify } from 'node:util'

import sharp from 'sharp'
import { describe, expect, it } from 'vitest'

import {
  classifyOverlayState,
  FINDING_MATCH_CROP,
  generateFindingMatchOverlay,
  processCapturedScreenshot,
} from '../lib/finding-match-overlay.mjs'

const run = promisify(execFile)

const makeFullScreenshot = async (state) => {
  const { height, left, top, width } = FINDING_MATCH_CROP
  const crop = Buffer.alloc(width * height * 4)

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const offset = (y * width + x) * 4
      crop[offset] = 12 + Math.round((x / width) * 18)
      crop[offset + 1] = 19 + Math.round((y / height) * 22)
      crop[offset + 2] = 30 + Math.round((x / width) * 34)
      crop[offset + 3] = 255
    }
  }

  const composites = []
  if (state === 'finding') {
    composites.push(
      {
        // The teal strip the queue line sits on. It is deliberately brighter
        // than the type it carries is in places, because that is what stops an
        // absolute luminance threshold from separating the two.
        input: Buffer.from(
          '<svg width="470" height="26"><rect width="470" height="26" fill="#2d5776"/></svg>',
        ),
        left: 356,
        top: 258,
      },
      {
        input: Buffer.from(
          '<svg width="390" height="20"><text x="0" y="15" fill="#cfd8de" font-size="15">NORMAL MATCH / ABILITY DRAFT / INDIA 0:34</text></svg>',
        ),
        left: 420,
        top: 262,
      },
      {
        input: Buffer.from(
          '<svg width="250" height="30"><text x="0" y="23" fill="#f6f8fa" font-size="24">FINDING MATCH</text></svg>',
        ),
        left: 486,
        top: 296,
      },
      {
        input: Buffer.from(
          '<svg width="36" height="36"><rect width="36" height="36" fill="#b34122"/></svg>',
        ),
        left: 748,
        top: 291,
      },
    )
  } else {
    composites.push({
      input: Buffer.from(
        '<svg width="330" height="50"><rect width="330" height="50" fill="#4f8a58"/></svg>',
      ),
      left: 452,
      top: 285,
    })
  }

  const cropPng = await sharp(crop, { raw: { channels: 4, height, width } })
    .composite(composites)
    .png()
    .toBuffer()

  return await sharp({
    create: { background: '#11161d', channels: 4, height: 1080, width: 1920 },
  })
    .composite([{ input: cropPng, left, top }])
    .png()
    .toBuffer()
}

const brightNeutralPixels = (data, info) => {
  let count = 0
  for (let y = 294; y <= 326; y += 1) {
    for (let x = 478; x <= 735; x += 1) {
      const offset = (y * info.width + x) * info.channels
      const red = data[offset]
      const green = data[offset + 1]
      const blue = data[offset + 2]
      const maximum = Math.max(red, green, blue)
      const minimum = Math.min(red, green, blue)
      const luminance = 0.2126 * red + 0.7152 * green + 0.0722 * blue
      if (luminance > 112 && maximum - minimum < 55) {
        count += 1
      }
    }
  }
  return count
}

// The queue line's own strip sits near luminance 80 and its type near 214, so
// anything this bright in the band is baked-in text rather than background.
const queueLinePixels = (data, info) => {
  let count = 0
  for (let y = 262; y <= 280; y += 1) {
    for (let x = 360; x <= 828; x += 1) {
      const offset = (y * info.width + x) * info.channels
      const luminance =
        0.2126 * data[offset] + 0.7152 * data[offset + 1] + 0.0722 * data[offset + 2]
      if (luminance > 140) {
        count += 1
      }
    }
  }
  return count
}

const isErasedRegion = (x, y) =>
  (x >= 473 && x <= 740 && y >= 289 && y <= 331) || (x >= 356 && x <= 831 && y >= 259 && y <= 283)

describe('finding match overlay generation', () => {
  it('crops the fixed 1080p client region and removes only the baked queue text', async () => {
    const source = await makeFullScreenshot('finding')
    const directory = await mkdtemp(path.join(tmpdir(), 'finding-match-overlay-'))
    const input = path.join(directory, 'source.png')
    const output = path.join(directory, 'finding-match.png')
    await sharp(source).toFile(input)

    await generateFindingMatchOverlay({ input, output, state: 'finding' })

    const sourceCrop = await sharp(source)
      .extract(FINDING_MATCH_CROP)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true })
    const generated = await sharp(await readFile(output))
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true })

    expect(generated.info.width).toBe(840)
    expect(generated.info.height).toBe(355)
    expect(brightNeutralPixels(sourceCrop.data, sourceCrop.info)).toBeGreaterThan(100)
    expect(brightNeutralPixels(generated.data, generated.info)).toBeLessThan(20)
    // The mode/region/timer line goes too: the overlay redraws it from the
    // streamer's own settings, and leaving it would publish the queue of
    // whoever captured the frame.
    expect(queueLinePixels(sourceCrop.data, sourceCrop.info)).toBeGreaterThan(100)
    expect(queueLinePixels(generated.data, generated.info)).toBeLessThan(20)

    for (let y = 0; y < generated.info.height; y += 1) {
      for (let x = 0; x < generated.info.width; x += 1) {
        if (isErasedRegion(x, y)) {
          continue
        }
        const offset = (y * generated.info.width + x) * generated.info.channels
        assert.deepEqual(
          [...generated.data.subarray(offset, offset + 4)],
          [...sourceCrop.data.subarray(offset, offset + 4)],
        )
      }
    }
  })

  it('keeps an idle crop pixel-identical', async () => {
    const source = await makeFullScreenshot('idle')
    const directory = await mkdtemp(path.join(tmpdir(), 'finding-match-overlay-'))
    const input = path.join(directory, 'source.png')
    const output = path.join(directory, 'finding-match-old.png')
    await sharp(source).toFile(input)

    await generateFindingMatchOverlay({ input, output, state: 'idle' })

    const expected = await sharp(source).extract(FINDING_MATCH_CROP).png().toBuffer()
    const [expectedPixels, generatedPixels] = await Promise.all([
      sharp(expected).raw().toBuffer(),
      sharp(await readFile(output))
        .raw()
        .toBuffer(),
    ])
    expect(generatedPixels).toEqual(expectedPixels)
  })

  it('creates the parent directories for an explicit output path', async () => {
    const source = await makeFullScreenshot('idle')
    const directory = await mkdtemp(path.join(tmpdir(), 'finding-match-overlay-'))
    const input = path.join(directory, 'source.png')
    const output = path.join(directory, 'nested', 'output', 'finding-match.png')
    await sharp(source).toFile(input)

    await generateFindingMatchOverlay({ input, output, state: 'idle' })

    await expect(sharp(output).metadata()).resolves.toMatchObject({
      height: 355,
      width: 840,
    })
  })

  it('distinguishes the real idle and queue screenshots by their stable controls', async () => {
    await expect(classifyOverlayState('public/images/overlay/finding-match.png')).resolves.toBe(
      'finding',
    )
    await expect(classifyOverlayState('public/images/overlay/finding-match-old.png')).resolves.toBe(
      'idle',
    )
  })

  it('rejects screenshots that are not a 1080p client or an existing 840x355 crop', async () => {
    const directory = await mkdtemp(path.join(tmpdir(), 'finding-match-overlay-'))
    const input = path.join(directory, 'source.png')
    await sharp({ create: { background: '#000', channels: 4, height: 720, width: 1280 } }).toFile(
      input,
    )

    let caughtError
    try {
      await generateFindingMatchOverlay({
        input,
        output: path.join(directory, 'finding-match.png'),
        state: 'finding',
      })
    } catch (error) {
      caughtError = error
    }

    expect(caughtError).toBeInstanceOf(Error)
    expect(caughtError.message).toContain('1920x1080')
  })

  it('routes an auto-detected capture to the matching asset and records its Dota build', async () => {
    const source = await makeFullScreenshot('finding')
    const directory = await mkdtemp(path.join(tmpdir(), 'finding-match-overlay-'))
    const input = path.join(directory, 'source.png')
    await sharp(source).toFile(input)

    const result = await processCapturedScreenshot({
      buildId: '12345678',
      capturedAt: '2026-09-05T12:00:00.000Z',
      input,
      outputDirectory: directory,
    })

    expect(result.state).toBe('finding')
    expect(path.basename(result.output)).toBe('finding-match.png')
    await expect(sharp(result.output).metadata()).resolves.toMatchObject({
      height: 355,
      width: 840,
    })
    await expect(
      readFile(path.join(directory, 'finding-match-source.json'), 'utf-8').then(JSON.parse),
    ).resolves.toMatchObject({
      clientResolution: '1920x1080',
      crop: FINDING_MATCH_CROP,
      dotaBuildId: '12345678',
      states: {
        finding: { capturedAt: '2026-09-05T12:00:00.000Z' },
      },
    })
  })

  it('records the native resolution a downscaled client frame came from', async () => {
    const source = await makeFullScreenshot('finding')
    const directory = await mkdtemp(path.join(tmpdir(), 'finding-match-overlay-'))
    const input = path.join(directory, 'source.png')
    await sharp(source).toFile(input)

    await processCapturedScreenshot({
      buildId: '25132749',
      capturedAt: '2026-09-05T12:00:00.000Z',
      input,
      outputDirectory: directory,
      source: { nativeResolution: '3840x2160' },
    })

    await expect(
      readFile(path.join(directory, 'finding-match-source.json'), 'utf-8').then(JSON.parse),
    ).resolves.toMatchObject({
      dotaBuildId: '25132749',
      source: 'installed Dota 2 client window',
      states: {
        finding: {
          capturedAt: '2026-09-05T12:00:00.000Z',
          findingMatchTextRemoved: true,
          nativeResolution: '3840x2160',
        },
      },
    })
  })

  it('starts fresh state coverage when the tracked Dota menu changes within one build', async () => {
    const directory = await mkdtemp(path.join(tmpdir(), 'finding-match-overlay-'))
    const idleInput = path.join(directory, 'idle.png')
    const findingInput = path.join(directory, 'finding.png')
    await sharp(await makeFullScreenshot('idle')).toFile(idleInput)
    await sharp(await makeFullScreenshot('finding')).toFile(findingInput)

    await processCapturedScreenshot({
      buildId: '25132749',
      input: idleInput,
      outputDirectory: directory,
      source: { menuFingerprint: 'old-menu' },
    })
    await processCapturedScreenshot({
      buildId: '25132749',
      input: findingInput,
      outputDirectory: directory,
      source: { menuFingerprint: 'new-menu' },
    })

    const manifest = JSON.parse(
      await readFile(path.join(directory, 'finding-match-source.json'), 'utf-8'),
    )
    expect(manifest.menuFingerprint).toBe('new-menu')
    expect(Object.keys(manifest.states)).toEqual(['finding'])
  })
})

describe('Dota client capture', () => {
  it('rejects a non-numeric settle delay before starting PowerShell', async () => {
    const directory = await mkdtemp(path.join(tmpdir(), 'finding-match-overlay-'))
    const cli = path.resolve('scripts/update-finding-match-overlay.mjs')
    const missingInput = path.join(directory, 'missing.png')

    let caughtError
    try {
      await run(process.execPath, [cli, '--input', missingInput, '--settle-ms', 'not-a-number'])
    } catch (error) {
      caughtError = error
    }

    expect(caughtError).toBeInstanceOf(Error)
    expect(caughtError.code).toBe(1)
    expect(caughtError.stderr.trim()).toBe('--settle-ms must be a non-negative integer')
  })

  const windowsTest = process.platform === 'win32' ? it : it.skip
  windowsTest('restores the foreground-lock timeout after attempting focus', async () => {
    const nativeSource = path.resolve('scripts/lib/DotaCapture.cs')
    const command = `
$ErrorActionPreference = 'Stop'
Add-Type @'
using System;
using System.Runtime.InteropServices;

public static class ForegroundTimeoutProbe {
  const uint SPI_GETFOREGROUNDLOCKTIMEOUT = 0x2000;
  const uint SPI_SETFOREGROUNDLOCKTIMEOUT = 0x2001;

  [DllImport("user32.dll")]
  static extern bool SystemParametersInfoA(uint action, uint param, ref uint value, uint flags);

  [DllImport("user32.dll")]
  static extern bool SystemParametersInfoA(uint action, uint param, IntPtr value, uint flags);

  public static uint Get() {
    uint value = 0;
    if (!SystemParametersInfoA(SPI_GETFOREGROUNDLOCKTIMEOUT, 0, ref value, 0)) {
      throw new InvalidOperationException("Could not read the foreground-lock timeout.");
    }
    return value;
  }

  public static bool TrySet(uint value) {
    return SystemParametersInfoA(SPI_SETFOREGROUNDLOCKTIMEOUT, 0, new IntPtr(value), 0);
  }
}
'@
Add-Type -Path $env:DOTABOD_CAPTURE_NATIVE_TEST
$original = [ForegroundTimeoutProbe]::Get()
$sentinel = if ($original -eq 424242) { 424243 } else { 424242 }
if (-not [ForegroundTimeoutProbe]::TrySet($sentinel)) {
  Write-Output 'SPI_SETFOREGROUNDLOCKTIMEOUT is unavailable in this Windows session.'
  exit 0
}
try {
  if ([ForegroundTimeoutProbe]::Get() -ne $sentinel) {
    throw 'Could not configure the foreground-lock timeout for the test.'
  }
  [void][DotaCapture]::Reveal([IntPtr]::Zero)
  $after = [ForegroundTimeoutProbe]::Get()
  if ($after -ne $sentinel) {
    throw "Foreground-lock timeout changed from $sentinel to $after."
  }
} finally {
  if (-not [ForegroundTimeoutProbe]::TrySet($original)) {
    throw 'Could not restore the foreground-lock timeout after the test.'
  }
}
`

    await expect(
      run('powershell.exe', ['-NoProfile', '-Command', command], {
        env: { ...process.env, DOTABOD_CAPTURE_NATIVE_TEST: nativeSource },
      }),
    ).resolves.toBeDefined()
  })
})
