import assert from 'node:assert/strict'
import { mkdtemp, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import sharp from 'sharp'
import { describe, expect, it } from 'vite-plus/test'
import {
  classifyOverlayState,
  FINDING_MATCH_CROP,
  generateFindingMatchOverlay,
  processCapturedScreenshot,
} from '../lib/finding-match-overlay.mjs'

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

  return sharp({
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
      if (luminance > 112 && maximum - minimum < 55) count += 1
    }
  }
  return count
}

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

    for (let y = 0; y < generated.info.height; y += 1) {
      for (let x = 0; x < generated.info.width; x += 1) {
        if (x >= 473 && x <= 740 && y >= 289 && y <= 331) continue
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

    let error
    try {
      await generateFindingMatchOverlay({
        input,
        output: path.join(directory, 'finding-match.png'),
        state: 'finding',
      })
    } catch (caught) {
      error = caught
    }

    expect(error).toBeInstanceOf(Error)
    expect(error.message).toContain('1920x1080')
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
      readFile(path.join(directory, 'finding-match-source.json'), 'utf8').then(JSON.parse),
    ).resolves.toMatchObject({
      clientResolution: '1920x1080',
      crop: FINDING_MATCH_CROP,
      dotaBuildId: '12345678',
      states: {
        finding: { capturedAt: '2026-09-05T12:00:00.000Z' },
      },
    })
  })

  it('records the accepted Twitch frame and its feedback-loop scores', async () => {
    const source = await makeFullScreenshot('finding')
    const directory = await mkdtemp(path.join(tmpdir(), 'finding-match-overlay-'))
    const input = path.join(directory, 'source.png')
    await sharp(source).toFile(input)

    await processCapturedScreenshot({
      buildId: '25132749',
      capturedAt: '2026-09-05T12:00:00.000Z',
      input,
      outputDirectory: directory,
      source: {
        channel: 'safe_streamer',
        evaluation: {
          motion_score: 1.23,
          reference_similarity: 0.42,
        },
        menuFingerprint: 'abc123',
        queueText: 'FINDING MATCH',
        streamId: '1234',
        streamUrl: 'https://www.twitch.tv/safe_streamer',
        type: 'twitch',
      },
    })

    await expect(
      readFile(path.join(directory, 'finding-match-source.json'), 'utf8').then(JSON.parse),
    ).resolves.toMatchObject({
      dotaBuildId: '25132749',
      menuFingerprint: 'abc123',
      source: 'Twitch native 1080p Dota 2 stream',
      states: {
        finding: {
          capturedAt: '2026-09-05T12:00:00.000Z',
          source: {
            channel: 'safe_streamer',
            motionScore: 1.23,
            queueText: 'FINDING MATCH',
            referenceSimilarity: 0.42,
            streamId: '1234',
            streamUrl: 'https://www.twitch.tv/safe_streamer',
          },
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
      source: { menuFingerprint: 'old-menu', type: 'twitch' },
    })
    await processCapturedScreenshot({
      buildId: '25132749',
      input: findingInput,
      outputDirectory: directory,
      source: { menuFingerprint: 'new-menu', type: 'twitch' },
    })

    const manifest = JSON.parse(
      await readFile(path.join(directory, 'finding-match-source.json'), 'utf8'),
    )
    expect(manifest.menuFingerprint).toBe('new-menu')
    expect(Object.keys(manifest.states)).toEqual(['finding'])
  })
})
