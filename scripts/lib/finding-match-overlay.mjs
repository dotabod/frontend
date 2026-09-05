import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

export const FINDING_MATCH_CROP = {
  height: 355,
  left: 1080,
  top: 725,
  width: 840,
}

const TEXT_SCAN = { bottom: 326, left: 478, right: 735, top: 294 }
const TEXT_EDIT = { bottom: 331, left: 473, right: 740, top: 289 }
const IDLE_CONTROL = { bottom: 340, left: 445, right: 790, top: 275 }
const FINDING_CONTROL = { bottom: 335, left: 742, right: 790, top: 285 }

const cropPipeline = async (input) => {
  const image = sharp(input, { failOn: 'error' })
  const metadata = await image.metadata()

  if (metadata.width === 1920 && metadata.height === 1080) {
    return image.extract(FINDING_MATCH_CROP)
  }

  if (
    metadata.width === FINDING_MATCH_CROP.width &&
    metadata.height === FINDING_MATCH_CROP.height
  ) {
    return image
  }

  throw new Error(
    `Expected a 1920x1080 Dota 2 client screenshot or an existing 840x355 crop, received ${metadata.width ?? 'unknown'}x${metadata.height ?? 'unknown'}`,
  )
}

const ratioInRegion = (data, info, region, predicate) => {
  let matches = 0
  let pixels = 0

  for (let y = region.top; y < region.bottom; y += 1) {
    for (let x = region.left; x < region.right; x += 1) {
      const offset = (y * info.width + x) * info.channels
      if (predicate(data[offset], data[offset + 1], data[offset + 2])) matches += 1
      pixels += 1
    }
  }

  return matches / pixels
}

const rgbToHue = (red, green, blue) => {
  const maximum = Math.max(red, green, blue)
  const minimum = Math.min(red, green, blue)
  const difference = maximum - minimum
  if (difference === 0) return 0

  let hue
  if (maximum === red) hue = ((green - blue) / difference) % 6
  else if (maximum === green) hue = (blue - red) / difference + 2
  else hue = (red - green) / difference + 4

  return (hue * 60 + 360) % 360
}

const saturation = (red, green, blue) => {
  const maximum = Math.max(red, green, blue)
  const minimum = Math.min(red, green, blue)
  return maximum === 0 ? 0 : (maximum - minimum) / maximum
}

const classifyPixels = (data, info) => {
  const redRatio = ratioInRegion(data, info, FINDING_CONTROL, (red, green, blue) => {
    const hue = rgbToHue(red, green, blue)
    return (hue <= 25 || hue >= 345) && saturation(red, green, blue) > 0.38 && red > 80
  })

  if (redRatio > 0.08) return 'finding'

  const greenRatio = ratioInRegion(data, info, IDLE_CONTROL, (red, green, blue) => {
    const hue = rgbToHue(red, green, blue)
    return hue >= 70 && hue <= 165 && saturation(red, green, blue) > 0.22 && green > 50
  })

  if (greenRatio > 0.12) return 'idle'

  return 'unknown'
}

export const classifyOverlayState = async (input) => {
  const pipeline = await cropPipeline(input)
  const { data, info } = await pipeline.ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  return classifyPixels(data, info)
}

const buildTextMask = (data, info) => {
  const mask = new Uint8Array(info.width * info.height)

  for (let y = TEXT_SCAN.top; y <= TEXT_SCAN.bottom; y += 1) {
    for (let x = TEXT_SCAN.left; x <= TEXT_SCAN.right; x += 1) {
      const offset = (y * info.width + x) * info.channels
      const red = data[offset]
      const green = data[offset + 1]
      const blue = data[offset + 2]
      const maximum = Math.max(red, green, blue)
      const minimum = Math.min(red, green, blue)
      const luminance = 0.2126 * red + 0.7152 * green + 0.0722 * blue

      if (luminance > 112 && maximum - minimum < 55) mask[y * info.width + x] = 1
    }
  }

  const textPixels = mask.slice()
  const radius = 5
  for (let y = TEXT_SCAN.top; y <= TEXT_SCAN.bottom; y += 1) {
    for (let x = TEXT_SCAN.left; x <= TEXT_SCAN.right; x += 1) {
      if (!textPixels[y * info.width + x]) continue

      for (let deltaY = -radius; deltaY <= radius; deltaY += 1) {
        for (let deltaX = -radius; deltaX <= radius; deltaX += 1) {
          if (deltaX * deltaX + deltaY * deltaY > radius * radius) continue
          const targetX = x + deltaX
          const targetY = y + deltaY
          if (
            targetX >= TEXT_EDIT.left &&
            targetX <= TEXT_EDIT.right &&
            targetY >= TEXT_EDIT.top &&
            targetY <= TEXT_EDIT.bottom
          ) {
            mask[targetY * info.width + targetX] = 1
          }
        }
      }
    }
  }

  return mask
}

const initializeMaskedRuns = (pixels, mask, info) => {
  for (let y = TEXT_EDIT.top; y <= TEXT_EDIT.bottom; y += 1) {
    let x = TEXT_EDIT.left
    while (x <= TEXT_EDIT.right) {
      if (!mask[y * info.width + x]) {
        x += 1
        continue
      }

      const start = x
      while (x <= TEXT_EDIT.right && mask[y * info.width + x]) x += 1
      const end = x - 1
      const left = (y * info.width + Math.max(0, start - 1)) * info.channels
      const right = (y * info.width + Math.min(info.width - 1, end + 1)) * info.channels

      for (let targetX = start; targetX <= end; targetX += 1) {
        const progress = (targetX - start + 1) / (end - start + 2)
        const offset = (y * info.width + targetX) * info.channels
        for (let channel = 0; channel < info.channels; channel += 1) {
          pixels[offset + channel] =
            pixels[left + channel] * (1 - progress) + pixels[right + channel] * progress
        }
      }
    }
  }
}

const eraseFindingMatchText = (data, info) => {
  const mask = buildTextMask(data, info)
  if (!mask.some(Boolean)) return data

  let current = Float32Array.from(data)
  let next = current.slice()
  initializeMaskedRuns(current, mask, info)
  const maskedPixels = []
  for (let y = TEXT_EDIT.top; y <= TEXT_EDIT.bottom; y += 1) {
    for (let x = TEXT_EDIT.left; x <= TEXT_EDIT.right; x += 1) {
      if (mask[y * info.width + x]) maskedPixels.push([x, y])
    }
  }

  const neighbors = [
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1],
  ]

  for (let iteration = 0; iteration < 200; iteration += 1) {
    for (const [x, y] of maskedPixels) {
      const offset = (y * info.width + x) * info.channels

      for (let channel = 0; channel < info.channels; channel += 1) {
        let total = 0
        for (const [deltaX, deltaY] of neighbors) {
          const neighbor = ((y + deltaY) * info.width + x + deltaX) * info.channels
          total += current[neighbor + channel]
        }
        next[offset + channel] = total / neighbors.length
      }
    }
    ;[current, next] = [next, current]
  }

  for (let pixel = 0; pixel < mask.length; pixel += 1) {
    if (!mask[pixel]) continue
    const offset = pixel * info.channels
    for (let channel = 0; channel < info.channels; channel += 1) {
      data[offset + channel] = Math.round(current[offset + channel])
    }
  }

  return data
}

export const generateFindingMatchOverlay = async ({ input, output, state = 'auto' }) => {
  const pipeline = await cropPipeline(input)
  const { data, info } = await pipeline.ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const detectedState = state === 'auto' ? classifyPixels(data, info) : state

  if (!['finding', 'idle'].includes(detectedState)) {
    throw new Error('Could not identify the Dota 2 queue state from the expected controls')
  }

  if (detectedState === 'finding') eraseFindingMatchText(data, info)

  const temporary = `${output}.${process.pid}.tmp.png`
  await sharp(data, { raw: info }).png({ compressionLevel: 9 }).toFile(temporary)
  await rename(temporary, output)

  return { output: path.resolve(output), state: detectedState }
}

export const processCapturedScreenshot = async ({
  buildId,
  capturedAt = new Date().toISOString(),
  input,
  outputDirectory,
  source,
}) => {
  const state = await classifyOverlayState(input)
  if (state === 'unknown') {
    throw new Error('Could not identify the Dota 2 queue state from the expected controls')
  }

  await mkdir(outputDirectory, { recursive: true })
  const output = path.join(
    outputDirectory,
    state === 'finding' ? 'finding-match.png' : 'finding-match-old.png',
  )
  await generateFindingMatchOverlay({ input, output, state })

  const manifestPath = path.join(outputDirectory, 'finding-match-source.json')
  let manifest
  try {
    manifest = JSON.parse(await readFile(manifestPath, 'utf8'))
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error
  }

  if (
    !manifest ||
    manifest.dotaBuildId !== buildId ||
    (source?.menuFingerprint && manifest.menuFingerprint !== source.menuFingerprint)
  ) {
    manifest = {
      clientResolution: '1920x1080',
      crop: FINDING_MATCH_CROP,
      dotaBuildId: buildId,
      ...(source?.menuFingerprint ? { menuFingerprint: source.menuFingerprint } : {}),
      schemaVersion: 1,
      source:
        source?.type === 'twitch'
          ? 'Twitch native 1080p Dota 2 stream'
          : 'installed Dota 2 client window',
      states: {},
    }
  }

  manifest.states[state] = {
    capturedAt,
    ...(state === 'finding' ? { findingMatchTextRemoved: true } : {}),
    ...(source?.type === 'twitch'
      ? {
          source: {
            channel: source.channel,
            motionScore: source.evaluation?.motion_score,
            queueText: source.queueText,
            referenceSimilarity: source.evaluation?.reference_similarity,
            streamId: source.streamId,
            streamUrl: source.streamUrl,
          },
        }
      : {}),
  }
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`)

  return { manifestPath, output: path.resolve(output), state }
}
