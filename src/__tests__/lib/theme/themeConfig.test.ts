import { theme } from 'antd'
import { describe, expect, it } from 'vite-plus/test'
import themeConfig from '@/lib/theme/themeConfig'

type Oklch = [lightness: number, chroma: number, hue?: number]
type Rgba = [red: number, green: number, blue: number, alpha: number]

const cssColorValues: Record<string, Oklch> = {
  '--color-gray-200': [0.922, 0, 0],
  '--color-gray-300': [0.87, 0, 0],
  '--color-gray-400': [0.708, 0, 0],
  '--color-gray-500': [0.556, 0, 0],
  '--color-gray-600': [0.439, 0, 0],
  '--color-gray-700': [0.371, 0, 0],
  '--color-gray-800': [0.269, 0, 0],
  '--color-gray-900': [0.205, 0, 0],
  '--color-purple-200': [0.902, 0.063, 306.703],
  '--color-purple-300': [0.827, 0.119, 306.383],
  '--color-purple-400': [0.714, 0.203, 305.504],
  '--color-purple-500': [0.627, 0.265, 303.9],
  '--color-purple-700': [0.496, 0.265, 301.924],
  '--color-purple-800': [0.438, 0.218, 303.724],
  '--color-purple-900': [0.381, 0.176, 304.987],
  '--color-purple-950': [0.291, 0.149, 302.717],
}

function oklchToRgba([lightness, chroma, hue = 0]: Oklch): Rgba {
  const radians = (hue * Math.PI) / 180
  const a = chroma * Math.cos(radians)
  const b = chroma * Math.sin(radians)
  const l = (lightness + 0.3963377774 * a + 0.2158037573 * b) ** 3
  const m = (lightness - 0.1055613458 * a - 0.0638541728 * b) ** 3
  const s = (lightness - 0.0894841775 * a - 1.291485548 * b) ** 3
  const clamp = (value: number) => Math.max(0, Math.min(1, value))
  const toSrgb = (value: number) =>
    value <= 0.0031308 ? 12.92 * value : 1.055 * value ** (1 / 2.4) - 0.055

  return [
    clamp(toSrgb(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s)),
    clamp(toSrgb(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s)),
    clamp(toSrgb(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s)),
    1,
  ]
}

function parseColor(value: string): Rgba {
  const variable = value.match(/^var\((--[^)]+)\)$/)?.[1]
  if (variable) {
    const resolved = cssColorValues[variable]
    if (!resolved) throw new Error(`Missing test color value for ${variable}`)
    return oklchToRgba(resolved)
  }

  const shorthandHex = value.match(/^#([\da-f]{3})$/i)?.[1]
  const hex = shorthandHex
    ? shorthandHex
        .split('')
        .map((character) => `${character}${character}`)
        .join('')
    : value.match(/^#([\da-f]{6})$/i)?.[1]
  if (hex) {
    return [
      Number.parseInt(hex.slice(0, 2), 16) / 255,
      Number.parseInt(hex.slice(2, 4), 16) / 255,
      Number.parseInt(hex.slice(4, 6), 16) / 255,
      1,
    ]
  }

  const rgb = value
    .match(/^rgba?\(([^)]+)\)$/)?.[1]
    ?.split(',')
    .map(Number)
  if (rgb?.length === 3 || rgb?.length === 4) {
    return [rgb[0] / 255, rgb[1] / 255, rgb[2] / 255, rgb[3] ?? 1]
  }

  throw new Error(`Unsupported test color: ${value}`)
}

function composite(foreground: Rgba, background: Rgba): Rgba {
  const alpha = foreground[3] + background[3] * (1 - foreground[3])
  return [
    (foreground[0] * foreground[3] + background[0] * background[3] * (1 - foreground[3])) / alpha,
    (foreground[1] * foreground[3] + background[1] * background[3] * (1 - foreground[3])) / alpha,
    (foreground[2] * foreground[3] + background[2] * background[3] * (1 - foreground[3])) / alpha,
    alpha,
  ]
}

function relativeLuminance(color: Rgba) {
  const linear = color
    .slice(0, 3)
    .map((channel) => (channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4))
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2]
}

function contrastRatio(foreground: string, background: string, canvas?: string) {
  let foregroundColor = parseColor(foreground)
  let backgroundColor = parseColor(background)
  const canvasColor = parseColor(canvas ?? 'var(--color-gray-900)')

  if (backgroundColor[3] < 1) backgroundColor = composite(backgroundColor, canvasColor)
  if (foregroundColor[3] < 1) foregroundColor = composite(foregroundColor, backgroundColor)

  const foregroundLuminance = relativeLuminance(foregroundColor)
  const backgroundLuminance = relativeLuminance(backgroundColor)

  return (
    (Math.max(foregroundLuminance, backgroundLuminance) + 0.05) /
    (Math.min(foregroundLuminance, backgroundLuminance) + 0.05)
  )
}

describe('themeConfig contrast', () => {
  const tokens = theme.getDesignToken(themeConfig)
  const button = themeConfig.components?.Button ?? {}
  const checkbox = themeConfig.components?.Checkbox ?? {}
  const radio = themeConfig.components?.Radio ?? {}
  const segmented = themeConfig.components?.Segmented ?? {}
  const switchTokens = themeConfig.components?.Switch ?? {}
  const tabs = themeConfig.components?.Tabs ?? {}

  it('keeps selected control text readable against its surface', () => {
    const foreground = radio.colorPrimary ?? tokens.colorPrimary
    const background = radio.buttonCheckedBg ?? tokens.colorBgContainer

    expect(contrastRatio(foreground, background)).toBeGreaterThanOrEqual(4.5)
  })

  it('keeps primary button labels readable in every pointer state', () => {
    const foreground = button.primaryColor ?? tokens.colorTextLightSolid
    const backgrounds = [
      button.colorPrimary ?? tokens.colorPrimary,
      button.colorPrimaryHover ?? tokens.colorPrimaryHover,
      button.colorPrimaryActive ?? tokens.colorPrimaryActive,
    ]

    for (const background of backgrounds) {
      expect(contrastRatio(foreground, background)).toBeGreaterThanOrEqual(4.5)
    }
  })

  it('keeps default button labels readable on hover and press', () => {
    const states = [
      [
        button.defaultHoverColor ?? tokens.colorPrimaryHover,
        button.defaultHoverBg ?? tokens.colorBgContainer,
      ],
      [
        button.defaultActiveColor ?? tokens.colorPrimaryActive,
        button.defaultActiveBg ?? tokens.colorBgContainer,
      ],
    ]

    for (const [foreground, background] of states) {
      expect(contrastRatio(foreground, background)).toBeGreaterThanOrEqual(4.5)
    }
  })

  it('keeps selected tabs and segmented controls readable', () => {
    const states = [
      [
        segmented.itemSelectedColor ?? tokens.colorText,
        segmented.itemSelectedBg ?? tokens.colorBgElevated,
      ],
      [tabs.itemSelectedColor ?? tokens.colorPrimary, tokens.colorBgContainer],
    ]

    for (const [foreground, background] of states) {
      expect(contrastRatio(foreground, background)).toBeGreaterThanOrEqual(4.5)
    }
  })

  it('keeps checked indicators distinct from both their glyph and surrounding surface', () => {
    const checkboxBackground = checkbox.colorPrimary ?? tokens.colorPrimary
    const switchBackground = switchTokens.colorPrimary ?? tokens.colorPrimary

    expect(contrastRatio(tokens.colorWhite, checkboxBackground)).toBeGreaterThanOrEqual(3)
    expect(contrastRatio(checkboxBackground, tokens.colorBgContainer)).toBeGreaterThanOrEqual(3)
    expect(contrastRatio(switchBackground, tokens.colorBgContainer)).toBeGreaterThanOrEqual(3)
  })

  it('keeps disabled control labels legible while their disabled state remains semantic', () => {
    expect(
      contrastRatio(tokens.colorTextDisabled, tokens.colorBgContainerDisabled),
    ).toBeGreaterThanOrEqual(4.5)
  })
})
