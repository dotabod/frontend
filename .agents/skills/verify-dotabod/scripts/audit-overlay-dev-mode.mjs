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
const fixturePath = path.resolve(
  option(
    'fixture',
    path.join(process.env.FRONTEND_OUTPUT_DIR ?? 'artifacts/verify-dotabod', 'overlay-fixture.json'),
  ),
)
const axeScriptPath = option('axe-script', process.env.FRONTEND_AXE_SCRIPT || null)
const outputDir = path.resolve(
  option('output-dir', process.env.FRONTEND_OUTPUT_DIR ?? 'artifacts/verify-dotabod'),
)
const expectedSocketOrigin = option('expected-socket-origin', null)

await fs.mkdir(outputDir, { recursive: true })
const fixture = JSON.parse(await fs.readFile(fixturePath, 'utf8'))
if (!fixture.userId) throw new Error(`Overlay fixture has no userId: ${fixturePath}`)
const axeSource = axeScriptPath ? await fs.readFile(axeScriptPath, 'utf8') : null

const settingsResponse = await fetch(`${baseUrl}/api/settings?id=${encodeURIComponent(fixture.userId)}`)
if (!settingsResponse.ok) {
  throw new Error(`Overlay settings request failed: ${settingsResponse.status}`)
}
const settings = await settingsResponse.json()
if (settings.subscription?.status !== 'ACTIVE' || settings.subscription?.tier !== 'PRO') {
  throw new Error(`Overlay fixture subscription is not active Pro: ${JSON.stringify(settings.subscription)}`)
}

const tabs = await fetch(`${cdpUrl}/json/list`).then((response) => response.json())
const tab = tabs.find((candidate) => candidate.type === 'page')
if (!tab) throw new Error(`No Chromium page target found at ${cdpUrl}`)

const socket = new WebSocket(tab.webSocketDebuggerUrl)
const pending = new Map()
const browserExceptions = []
const failedAssets = []
const failedResponses = []
const socketRequests = []
let commandId = 0

await new Promise((resolve, reject) => {
  socket.addEventListener('open', resolve, { once: true })
  socket.addEventListener('error', reject, { once: true })
})

socket.addEventListener('message', (event) => {
  const message = JSON.parse(event.data)
  if (message.method === 'Runtime.exceptionThrown') {
    browserExceptions.push(message.params.exceptionDetails.text)
  }
  if (
    message.method === 'Network.loadingFailed' &&
    ['Document', 'Font', 'Image', 'Script', 'Stylesheet'].includes(message.params.type) &&
    !message.params.canceled
  ) {
    failedAssets.push({ errorText: message.params.errorText, type: message.params.type })
  }
  if (message.method === 'Network.requestWillBeSent') {
    const requestUrl = message.params.request.url
    if (requestUrl.includes('/socket.io')) {
      socketRequests.push(requestUrl)
    }
  }
  if (
    message.method === 'Network.responseReceived' &&
    ['Document', 'Font', 'Image', 'Script', 'Stylesheet'].includes(message.params.type) &&
    message.params.response.status >= 400
  ) {
    failedResponses.push({
      status: message.params.response.status,
      type: message.params.type,
      url: message.params.response.url,
    })
  }

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

async function waitFor(expression, label, attempts = 75) {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    if (await evaluate(expression)) return
    await delay(200)
  }
  throw new Error(`Timed out waiting for ${label}`)
}

function assert(condition, message, failures) {
  if (!condition) failures.push(message)
}

async function screenshot(name) {
  const result = await send('Page.captureScreenshot', {
    captureBeyondViewport: false,
    format: 'png',
    fromSurface: true,
  })
  await fs.writeFile(path.join(outputDir, name), Buffer.from(result.data, 'base64'))
}

async function clickElement(expression, label) {
  const point = await evaluate(`(() => {
    const element = ${expression}
    if (!element) return null
    element.scrollIntoView({ block: 'center', inline: 'center' })
    const bounds = element.getBoundingClientRect()
    if (bounds.width <= 0 || bounds.height <= 0) return null
    return { x: bounds.left + bounds.width / 2, y: bounds.top + bounds.height / 2 }
  })()`)
  if (!point) throw new Error(`${label} not found`)
  await send('Input.dispatchMouseEvent', {
    type: 'mouseMoved',
    x: point.x,
    y: point.y,
  })
  await send('Input.dispatchMouseEvent', {
    button: 'left',
    clickCount: 1,
    type: 'mousePressed',
    x: point.x,
    y: point.y,
  })
  await send('Input.dispatchMouseEvent', {
    button: 'left',
    clickCount: 1,
    type: 'mouseReleased',
    x: point.x,
    y: point.y,
  })
}

async function chooseSelect(index, label) {
  await clickElement(
    `[...document.querySelectorAll('.ant-select')][${index}]?.querySelector('.ant-select-selector')`,
    `Overlay select ${index}`,
  )
  const optionExpression = `[...document.querySelectorAll('.ant-select-item-option-content')]
    .find((node) => {
      const option = node.closest('.ant-select-item-option')
      if (node.textContent.trim() !== ${JSON.stringify(label)} || !option) return false
      const bounds = option.getBoundingClientRect()
      return bounds.width > 0 && bounds.height > 0
    })
    ?.closest('.ant-select-item-option')`
  await waitFor(
    `Boolean(${optionExpression})`,
    `${label} select option`,
  )
  await clickElement(optionExpression, `${label} select option`)
  await waitFor(
    `[...document.querySelectorAll('.ant-select-selection-item')][${index}]?.textContent.trim() === ${JSON.stringify(label)}`,
    `${label} selection`,
  )
}

await send('Page.enable')
await send('Runtime.enable')
await send('Network.enable')
await send('Page.addScriptToEvaluateOnNewDocument', {
  source: `try { window.localStorage.setItem('isDev', 'true') } catch {}`,
})
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

const route = `/overlay/${fixture.userId}`
const viewports = [
  { height: 1080, name: '16x9', width: 1920 },
  { height: 1080, name: '21x9', width: 2560 },
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
  await send('Page.navigate', { url: `${baseUrl}${route}` })
  await waitFor(
    `document.readyState === 'complete' && Boolean(document.querySelector('[aria-label="Drag to move window"]')) && Boolean(document.querySelector('img[alt="playing dev screenshot"]'))`,
    `${viewport.name} dev overlay`,
  )
  await evaluate(
    `(async () => {
      await document.fonts.ready
      await Promise.race([
        Promise.all([...document.images].map((image) => image.complete ? null : new Promise((resolve) => {
          image.addEventListener('load', resolve, { once: true })
          image.addEventListener('error', resolve, { once: true })
        }))),
        new Promise((resolve) => setTimeout(resolve, 5000)),
      ])
    })()`,
    true,
  )

  const dom = await evaluate(`(() => {
    const dragHandle = document.querySelector('[aria-label="Drag to move window"]')
    const controls = dragHandle?.parentElement
    const image = document.querySelector('img[alt="playing dev screenshot"]')
    return {
      controlText: controls?.textContent ?? '',
      documentOverflow: document.documentElement.scrollWidth > window.innerWidth,
      image: image ? {
        complete: image.complete,
        naturalHeight: image.naturalHeight,
        naturalWidth: image.naturalWidth,
        src: image.getAttribute('src'),
      } : null,
      ingameCard: Boolean(document.querySelector('#ingame-wl-mmr-card')),
      rankCard: Boolean(document.querySelector('#rank-card')),
      title: document.title,
      winLossText: document.querySelector('#win-loss-card')?.textContent.trim() ?? '',
    }
  })()`)

  let violations = []
  if (axeSource) {
    await evaluate(axeSource)
    violations = await evaluate(
      `axe.run(document.querySelector('[aria-label="Drag to move window"]').parentElement, {
        runOnly: {
          type: 'tag',
          values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'],
        },
        resultTypes: ['violations'],
      }).then(({ violations }) => violations.map(({ id, impact, help, nodes }) => ({
        help,
        id,
        impact,
        nodes: nodes.map(({ failureSummary, target }) => ({ failureSummary, target })),
      })))`,
      true,
    )
  }

  assert(dom.title === 'Dotabod | Stream overlays', `${viewport.name}: overlay title changed`, failures)
  assert(dom.ingameCard, `${viewport.name}: playing overlay card missing`, failures)
  assert(
    dom.winLossText.includes('W') && dom.winLossText.includes('L'),
    `${viewport.name}: visible win/loss content missing`,
    failures,
  )
  assert(dom.rankCard, `${viewport.name}: visible rank card missing`, failures)
  assert(
    ['Block Controls', 'LastFM Settings', 'Show Dev Image', 'Persist Dev Mode', 'Chat Messages Testing'].every(
      (label) => dom.controlText.includes(label),
    ),
    `${viewport.name}: dev controls incomplete`,
    failures,
  )
  assert(
    dom.image?.complete && dom.image.naturalWidth > 0 && dom.image.naturalHeight > 0,
    `${viewport.name}: dev background image did not load`,
    failures,
  )
  const expectedImage = viewport.name === '21x9' ? '21-9-playing.png' : 'playing.png'
  assert(
    decodeURIComponent(dom.image?.src ?? '').includes(expectedImage),
    `${viewport.name}: expected ${expectedImage}, received ${dom.image?.src}`,
    failures,
  )
  assert(!dom.documentOverflow, `${viewport.name}: overlay document overflows horizontally`, failures)
  assert(
    violations.length === 0,
    `${viewport.name}: dev controls axe violations ${JSON.stringify(violations)}`,
    failures,
  )

  await screenshot(`overlay-playing-${viewport.name}.png`)
  audits.push({ route, viewport: viewport.name, violations, ...dom })

  if (viewport.name !== '16x9') continue

  await chooseSelect(1, 'Picks')
  await waitFor(
    `Boolean(document.querySelector('img[alt="picks dev screenshot"]')) && Boolean(document.querySelector('#pick-screen-hud'))`,
    'picks overlay state',
  )
  await chooseSelect(0, 'Dire')
  const picksState = await evaluate(`({
    controls: [...document.querySelectorAll('.ant-select-selection-item')]
      .map((node) => node.textContent.trim()),
    picksBlocker: Boolean(document.querySelector('#picks-blocker-parent')),
    picksHud: Boolean(document.querySelector('#pick-screen-hud')),
  })`)
  assert(
    picksState.controls[0] === 'Dire' && picksState.controls[1] === 'Picks',
    `Overlay controls did not select Dire/Picks: ${JSON.stringify(picksState.controls)}`,
    failures,
  )
  assert(picksState.picksHud, 'Picks HUD did not render', failures)
  assert(picksState.picksBlocker, 'Picks blocker surface did not render', failures)
  await send('Input.dispatchMouseEvent', {
    button: 'left',
    clickCount: 1,
    type: 'mousePressed',
    x: 1000,
    y: 1000,
  })
  await send('Input.dispatchMouseEvent', {
    button: 'left',
    clickCount: 1,
    type: 'mouseReleased',
    x: 1000,
    y: 1000,
  })
  await evaluate(`(() => {
    const button = [...document.querySelectorAll('button')]
      .find((node) => node.textContent.trim() === 'Clear Messages')
    button?.click()
  })()`)
  await evaluate(`(() => {
    const button = [...document.querySelectorAll('button')]
      .find((node) => node.textContent.trim() === 'Sample 1')
    button?.click()
  })()`)
  await waitFor(
    `document.querySelector('#chat-messages-overlay')?.textContent.includes('Hello everyone!')`,
    'sample overlay chat message',
  )
  const chatAdded = await evaluate(
    `document.querySelector('#chat-messages-overlay')?.textContent.includes('Hello everyone!') ?? false`,
  )
  await screenshot('overlay-chat-message-16x9.png')

  await evaluate(`(() => {
    const button = [...document.querySelectorAll('button')]
      .find((node) => node.textContent.trim() === 'Clear Messages')
    button?.click()
  })()`)
  await waitFor(`!document.querySelector('#chat-messages-overlay')`, 'cleared overlay chat messages')
  await screenshot('overlay-picks-16x9.png')

  await evaluate(`(() => {
    const checkbox = [...document.querySelectorAll('input[type="checkbox"]')]
      .find((node) => node.closest('label')?.textContent.includes('Show Dev Image'))
    checkbox?.click()
  })()`)
  await waitFor(`!document.querySelector('img[alt$="dev screenshot"]')`, 'hidden dev background')
  const interaction = await evaluate(`({
    chatCleared: !document.querySelector('#chat-messages-overlay'),
    devImageHidden: !document.querySelector('img[alt$="dev screenshot"]'),
    picksBlocker: Boolean(document.querySelector('#picks-blocker-parent')),
    picksHud: Boolean(document.querySelector('#pick-screen-hud')),
  })`)
  assert(chatAdded, 'Sample chat message was not added to the overlay', failures)
  assert(interaction.chatCleared, 'Overlay chat messages did not clear', failures)
  assert(interaction.devImageHidden, 'Dev background image did not hide', failures)
  assert(interaction.picksHud, 'Picks overlay disappeared after hiding dev image', failures)
  assert(interaction.picksBlocker, 'Picks blocker disappeared after hiding dev image', failures)
  await screenshot('overlay-picks-without-background-16x9.png')
  audits.at(-1).interaction = { chatAdded, ...interaction }
}

assert(failedAssets.length === 0, `Overlay assets failed to load: ${JSON.stringify(failedAssets)}`, failures)
assert(
  failedResponses.length === 0,
  `Overlay assets returned HTTP errors: ${JSON.stringify(failedResponses)}`,
  failures,
)
if (expectedSocketOrigin) {
  const unexpectedSocketRequests = socketRequests.filter(
    (requestUrl) => new URL(requestUrl).origin !== expectedSocketOrigin,
  )
  assert(socketRequests.length > 0, 'Overlay did not attempt a Socket.IO connection', failures)
  assert(
    unexpectedSocketRequests.length === 0,
    `Overlay contacted an unexpected Socket.IO origin: ${JSON.stringify(unexpectedSocketRequests)}`,
    failures,
  )
}
assert(
  browserExceptions.length === 0,
  `Overlay raised browser exceptions: ${JSON.stringify(browserExceptions)}`,
  failures,
)

const report = {
  audits,
  axeEnabled: Boolean(axeSource),
  browserExceptions,
  failedAssets,
  failedResponses,
  fixture: { userId: fixture.userId, username: fixture.username },
  expectedSocketOrigin,
  route,
  socketRequests,
}
await fs.writeFile(
  path.join(outputDir, 'overlay-dev-mode-audit.json'),
  `${JSON.stringify(report, null, 2)}\n`,
)
console.log(JSON.stringify(report, null, 2))
socket.close()

if (failures.length > 0) {
  throw new AggregateError(
    failures.map((message) => new Error(message)),
    'Overlay dev-mode audit failed',
  )
}
