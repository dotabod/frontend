import fs from 'node:fs/promises'
import path from 'node:path'

function option(name, fallback) {
  const index = process.argv.indexOf(`--${name}`)
  return index === -1 ? fallback : process.argv[index + 1]
}

const baseUrl = option(
  'base-url',
  process.env.FRONTEND_BASE_URL ?? 'http://127.0.0.1:3100',
).replace(/\/$/, '')
const cdpUrl = option('cdp-url', process.env.FRONTEND_CDP_URL ?? 'http://127.0.0.1:9223').replace(
  /\/$/,
  '',
)
const axeScriptPath = option('axe-script', process.env.FRONTEND_AXE_SCRIPT || null)
const outputDir = path.resolve(
  option('output-dir', process.env.FRONTEND_OUTPUT_DIR ?? 'artifacts/whats-new'),
)

await fs.mkdir(outputDir, { recursive: true })
const axeSource = axeScriptPath ? await fs.readFile(axeScriptPath, 'utf8') : null

const tabs = await fetch(`${cdpUrl}/json/list`).then((response) => response.json())
const tab = tabs.find((candidate) => candidate.type === 'page')
if (!tab) throw new Error(`No Chromium page target found at ${cdpUrl}`)

const socket = new WebSocket(tab.webSocketDebuggerUrl)
const pending = new Map()
let commandId = 0

await new Promise((resolve, reject) => {
  socket.addEventListener('open', resolve, { once: true })
  socket.addEventListener('error', reject, { once: true })
})

socket.addEventListener('message', (event) => {
  const message = JSON.parse(event.data)
  const request = pending.get(message.id)
  if (!request) return
  pending.delete(message.id)
  if (message.error) request.reject(new Error(message.error.message))
  else request.resolve(message.result)
})

function send(method, params = {}) {
  commandId += 1
  socket.send(JSON.stringify({ id: commandId, method, params }))
  return new Promise((resolve, reject) => pending.set(commandId, { reject, resolve }))
}

const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds))

async function evaluate(expression, awaitPromise = false) {
  const result = await send('Runtime.evaluate', { awaitPromise, expression, returnByValue: true })
  if (result.exceptionDetails) {
    const description = result.exceptionDetails.exception?.description
    throw new Error(description || result.exceptionDetails.text || 'Browser evaluation failed')
  }
  return result.result.value
}

async function waitFor(expression, label) {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    if (await evaluate(expression)) return
    await delay(200)
  }
  throw new Error(`Timed out waiting for ${label}`)
}

function assert(condition, message, failures) {
  if (!condition) failures.push(message)
}

async function pressTab() {
  await send('Input.dispatchKeyEvent', { code: 'Tab', key: 'Tab', type: 'keyDown' })
  await send('Input.dispatchKeyEvent', { code: 'Tab', key: 'Tab', type: 'keyUp' })
}

await send('Page.enable')
await send('Runtime.enable')
await send('Network.enable')
await send('Network.setCookie', {
  name: 'cookieConsent',
  url: baseUrl,
  value: JSON.stringify({
    analytics: false,
    marketing: false,
    necessary: true,
    preferences: false,
  }),
})

const viewports = [
  { height: 1000, name: 'desktop', width: 1440 },
  { height: 844, name: 'mobile', width: 390 },
]
const failures = []
const audits = []

for (const viewport of viewports) {
  await send('Emulation.setDeviceMetricsOverride', {
    deviceScaleFactor: 1,
    height: viewport.height,
    mobile: false,
    screenHeight: viewport.height,
    screenWidth: viewport.width,
    width: viewport.width,
  })
  await send('Page.navigate', { url: `${baseUrl}/whats-new` })
  await waitFor(
    `document.readyState === 'complete' && document.querySelectorAll('main article').length >= 20`,
    `${viewport.name} changelog`,
  )
  await evaluate(
    `(async () => {
      await document.fonts.ready
      window.scrollTo(0, 0)
      for (const selector of ['#hubspot-conversations-iframe', '[data-testid="cookie-consent"]']) {
        const node = document.querySelector(selector)
        if (node) node.style.setProperty('display', 'none', 'important')
      }
    })()`,
    true,
  )

  const initial = await evaluate(`(() => {
    const main = document.querySelector('main')
    const allButton = document.querySelector('button[aria-label="All updates"]')
    const articles = [...document.querySelectorAll('main article')]
    const firstArticle = articles[0]
    const firstBounds = firstArticle?.getBoundingClientRect()
    return {
      articleCount: articles.length,
      filterCount: document.querySelectorAll('button[aria-pressed]').length,
      firstArticleWidth: firstBounds ? Math.round(firstBounds.width) : null,
      h1: main?.querySelector('h1')?.textContent.trim() ?? null,
      latest: firstArticle?.textContent.includes('Latest release') ?? false,
      overflow: {
        document: document.documentElement.scrollWidth,
        viewport: window.innerWidth,
      },
      selectedFilter: allButton?.getAttribute('aria-pressed') ?? null,
      updateCount: main?.querySelector('[aria-live="polite"]')?.textContent.trim() ?? null,
    }
  })()`)

  await evaluate(`document.querySelector('button[aria-label="Chat & commands"]')?.click()`)
  await waitFor(
    `document.querySelector('main [aria-live="polite"]')?.textContent.trim() === '10 updates'`,
    `${viewport.name} filtered updates`,
  )
  const filtered = await evaluate(`(() => ({
    articleCount: document.querySelectorAll('main article').length,
    selected: document.querySelector('button[aria-label="Chat & commands"]')?.getAttribute('aria-pressed'),
    categories: [...document.querySelectorAll('main article > div:first-child > span:first-child')]
      .map((node) => node.textContent.trim()),
  }))()`)

  await evaluate(`document.querySelector('button[aria-label="All updates"]')?.click()`)
  await waitFor(
    `document.querySelector('main [aria-live="polite"]')?.textContent.trim() === '24 updates'`,
    `${viewport.name} restored updates`,
  )

  await evaluate(`document.body.focus()`)
  let keyboardFocus = null
  for (let index = 0; index < 40; index += 1) {
    await pressTab()
    keyboardFocus = await evaluate(`(() => {
      const active = document.activeElement
      if (active?.getAttribute('aria-label') !== 'All updates') return null
      const styles = getComputedStyle(active)
      return {
        label: active.getAttribute('aria-label'),
        outlineStyle: styles.outlineStyle,
        outlineWidth: styles.outlineWidth,
      }
    })()`)
    if (keyboardFocus) break
  }

  let violations = []
  if (axeSource) {
    await evaluate(axeSource)
    violations = await evaluate(
      `axe.run(document.querySelector('main'), {
        runOnly: {
          type: 'tag',
          values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'],
        },
        resultTypes: ['violations'],
      }).then(({ violations }) => violations.map(({ id, impact, help, nodes }) => ({
        help,
        id,
        impact,
        nodes: nodes.map(({ failureSummary, html, target }) => ({ failureSummary, html, target })),
      })))`,
      true,
    )
  }

  await evaluate(`window.scrollTo(0, 0)`)
  await evaluate(`(() => {
    for (const selector of [
      '#hubspot-conversations-iframe',
      '#hubspot-messages-iframe-container',
      'iframe[src*="hubspot"]',
    ]) {
      for (const node of document.querySelectorAll(selector)) {
        node.style.setProperty('display', 'none', 'important')
      }
    }
  })()`)
  const screenshot = await send('Page.captureScreenshot', {
    captureBeyondViewport: false,
    format: 'png',
    fromSurface: true,
  })
  await fs.writeFile(
    path.join(outputDir, `whats-new-${viewport.name}.png`),
    Buffer.from(screenshot.data, 'base64'),
  )

  assert(initial.h1 === "What's new", `${viewport.name}: page heading changed`, failures)
  assert(initial.articleCount === 24, `${viewport.name}: expected 24 releases`, failures)
  assert(initial.filterCount === 5, `${viewport.name}: expected five release filters`, failures)
  assert(initial.selectedFilter === 'true', `${viewport.name}: all filter not selected`, failures)
  assert(initial.updateCount === '24 updates', `${viewport.name}: wrong update count`, failures)
  assert(initial.latest, `${viewport.name}: latest release is not identified`, failures)
  assert(
    filtered.articleCount === 10,
    `${viewport.name}: chat filter returned wrong count`,
    failures,
  )
  assert(filtered.selected === 'true', `${viewport.name}: chat filter not selected`, failures)
  assert(
    filtered.categories.every((category) => ['Chat', 'Commands'].includes(category)),
    `${viewport.name}: chat filter leaked another category`,
    failures,
  )
  assert(
    initial.overflow.document <= initial.overflow.viewport,
    `${viewport.name}: page overflows horizontally`,
    failures,
  )
  assert(
    viewport.name === 'mobile'
      ? initial.firstArticleWidth <= 358
      : initial.firstArticleWidth <= 860,
    `${viewport.name}: release card width is unexpected`,
    failures,
  )
  assert(
    keyboardFocus?.outlineStyle !== 'none' && keyboardFocus?.outlineWidth !== '0px',
    `${viewport.name}: filter lacks visible keyboard focus`,
    failures,
  )
  assert(
    violations.length === 0,
    `${viewport.name}: axe violations ${JSON.stringify(violations)}`,
    failures,
  )

  audits.push({ filtered, initial, keyboardFocus, violations, viewport: viewport.name })
}

await fs.writeFile(
  path.join(outputDir, 'whats-new-audit.json'),
  `${JSON.stringify({ audits, failures }, null, 2)}\n`,
)
socket.close()

if (failures.length > 0) {
  throw new Error(`What's New verification failed:\n${failures.join('\n')}`)
}

console.log(`What's New verification passed for ${viewports.length} viewports`)
