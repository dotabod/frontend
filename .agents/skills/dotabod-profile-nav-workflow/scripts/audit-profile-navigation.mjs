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
const username = option('username', 'maxid1337')
const heroId = option('hero-id', '2')
const axeScriptPath = option('axe-script', process.env.FRONTEND_AXE_SCRIPT || null)
const outputDir = path.resolve(
  option('output-dir', process.env.FRONTEND_OUTPUT_DIR ?? 'artifacts/profile-navigation'),
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
  for (let attempt = 0; attempt < 50; attempt += 1) {
    if (await evaluate(expression)) return
    await delay(200)
  }
  throw new Error(`Timed out waiting for ${label}`)
}

async function navigate(route, readySelector = 'nav[aria-label="Profile sections"]') {
  await send('Page.navigate', { url: `${baseUrl}${route}` })
  await waitFor(
    `document.readyState === 'complete' && Boolean(document.querySelector(${JSON.stringify(readySelector)}))`,
    route,
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
      window.scrollTo(0, 0)
      const widget = document.querySelector('#hubspot-conversations-iframe')
      if (widget) widget.style.setProperty('display', 'none', 'important')
    })()`,
    true,
  )
}

function assert(condition, message, failures) {
  if (!condition) failures.push(message)
}

await send('Page.enable')
await send('Runtime.enable')
await send('Accessibility.enable')
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

const routes = [
  { current: 'Match history', name: 'match-history', path: `/${username}/matches` },
  {
    current: 'Match history',
    name: 'hero-win-rates',
    path: `/${username}/matches?view=heroes`,
  },
  { current: 'Cosmetic collection', name: 'collection', path: `/${username}/set` },
  {
    current: 'Cosmetic collection',
    name: 'hero-detail',
    path: `/${username}/set/${heroId}`,
  },
]
const viewports = [
  { height: 1000, name: 'desktop', width: 1440 },
  { height: 844, name: 'mobile', width: 390 },
]

const failures = []
const audits = []
const profileAudits = []

for (const viewport of viewports) {
  await send('Emulation.setDeviceMetricsOverride', {
    deviceScaleFactor: 1,
    height: viewport.height,
    mobile: false,
    screenHeight: viewport.height,
    screenWidth: viewport.width,
    width: viewport.width,
  })
  await navigate(`/${username}`, '[data-testid="profile-match-overview"]')

  const profileDom = await evaluate(`(() => {
    const overview = document.querySelector('[data-testid="profile-match-overview"]')
    if (!overview) return { error: 'Profile match overview missing' }
    const heroTable = overview.querySelector('table[aria-label="Most played heroes"]')
    const matchTable = overview.querySelector('table[aria-label="Latest matches"]')
    const heroRows = heroTable ? [...heroTable.querySelectorAll('tbody tr')] : []
    const matchRows = matchTable ? [...matchTable.querySelectorAll('tbody tr')] : []
    const links = [...overview.querySelectorAll('a')].map((link) => ({
      href: link.getAttribute('href'),
      label: link.getAttribute('aria-label') || link.textContent.trim(),
    }))
    const bounds = overview.getBoundingClientRect()

    return {
      bounds: {
        height: Math.ceil(bounds.height),
        width: Math.ceil(bounds.width),
        x: Math.floor(bounds.left + window.scrollX),
        y: Math.floor(bounds.top + window.scrollY),
      },
      error: null,
      headings: [...overview.querySelectorAll('h2')].map((heading) => heading.textContent.trim()),
      heroRows: heroRows.length,
      links,
      matchRows: matchRows.length,
      newestMatchHref: matchRows[0]?.querySelector('a[href*="opendota.com/matches/"]')?.getAttribute('href') ?? null,
      overflow: {
        document: document.documentElement.scrollWidth,
        viewport: window.innerWidth,
      },
      tables: [...overview.querySelectorAll('table')].map((table) => table.getAttribute('aria-label')),
    }
  })()`)

  let violations = []
  if (axeSource) {
    await evaluate(axeSource)
    violations = await evaluate(
      `axe.run(document.querySelector('[data-testid="profile-match-overview"]'), {
        runOnly: {
          type: 'tag',
          values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'],
        },
        resultTypes: ['violations'],
      }).then(({ violations }) => violations.map(({ id, impact, help, nodes }) => ({
        help,
        id,
        impact,
        nodes: nodes.length,
      })))`,
      true,
    )
  }

  if (profileDom.bounds) {
    const screenshot = await send('Page.captureScreenshot', {
      captureBeyondViewport: true,
      clip: {
        height: profileDom.bounds.height,
        scale: 1,
        width: profileDom.bounds.width,
        x: profileDom.bounds.x,
        y: profileDom.bounds.y,
      },
      format: 'png',
      fromSurface: true,
    })
    await fs.writeFile(
      path.join(outputDir, `profile-overview-${viewport.name}.png`),
      Buffer.from(screenshot.data, 'base64'),
    )
  }

  assert(!profileDom.error, `/${username} ${viewport.name}: ${profileDom.error}`, failures)
  assert(
    ['Most played heroes', 'Latest matches'].every((heading) =>
      profileDom.headings?.includes(heading),
    ),
    `/${username} ${viewport.name}: overview headings missing`,
    failures,
  )
  assert(
    ['Most played heroes', 'Latest matches'].every((label) => profileDom.tables?.includes(label)),
    `/${username} ${viewport.name}: semantic overview tables missing`,
    failures,
  )
  assert(
    profileDom.heroRows > 0 && profileDom.heroRows <= 5,
    `/${username} ${viewport.name}: expected one to five hero rows`,
    failures,
  )
  assert(
    profileDom.matchRows > 0 && profileDom.matchRows <= 5,
    `/${username} ${viewport.name}: expected one to five match rows`,
    failures,
  )
  assert(
    profileDom.links?.some(
      (link) =>
        link.label === 'View all hero win rates' &&
        link.href === `/${username}/matches?view=heroes`,
    ),
    `/${username} ${viewport.name}: hero win-rate destination missing`,
    failures,
  )
  assert(
    profileDom.links?.some(
      (link) => link.label === 'View all matches' && link.href === `/${username}/matches`,
    ),
    `/${username} ${viewport.name}: full match-history destination missing`,
    failures,
  )
  assert(
    profileDom.newestMatchHref === 'https://www.opendota.com/matches/8964010929',
    `/${username} ${viewport.name}: latest match is not first`,
    failures,
  )
  assert(
    profileDom.overflow.document <= profileDom.overflow.viewport,
    `/${username} ${viewport.name}: document overflows horizontally`,
    failures,
  )
  assert(
    violations.length === 0,
    `/${username} ${viewport.name}: axe violations ${JSON.stringify(violations)}`,
    failures,
  )

  profileAudits.push({ route: `/${username}`, viewport: viewport.name, violations, ...profileDom })
}

for (const route of routes) {
  for (const viewport of viewports) {
    await send('Emulation.setDeviceMetricsOverride', {
      deviceScaleFactor: 1,
      height: viewport.height,
      mobile: false,
      screenHeight: viewport.height,
      screenWidth: viewport.width,
      width: viewport.width,
    })
    await navigate(route.path)

    const dom = await evaluate(`(() => {
      const nav = document.querySelector('nav[aria-label="Profile sections"]')
      if (!nav) return { error: 'Profile sections navigation missing' }

      const canvas = document.createElement('canvas')
      const context = canvas.getContext('2d', { willReadFrequently: true })
      const rgba = (color) => {
        context.clearRect(0, 0, 1, 1)
        context.fillStyle = color
        context.fillRect(0, 0, 1, 1)
        return Array.from(context.getImageData(0, 0, 1, 1).data)
      }
      const luminance = ([red, green, blue]) => {
        const values = [red, green, blue].map((value) => {
          const channel = value / 255
          return channel <= 0.04045
            ? channel / 12.92
            : Math.pow((channel + 0.055) / 1.055, 2.4)
        })
        return values[0] * 0.2126 + values[1] * 0.7152 + values[2] * 0.0722
      }
      const contrast = (foreground, background) => {
        const lighter = Math.max(luminance(foreground), luminance(background))
        const darker = Math.min(luminance(foreground), luminance(background))
        return Number(((lighter + 0.05) / (darker + 0.05)).toFixed(2))
      }
      let backgroundNode = nav
      let background = [0, 0, 0, 0]
      while (backgroundNode && background[3] === 0) {
        background = rgba(getComputedStyle(backgroundNode).backgroundColor)
        backgroundNode = backgroundNode.parentElement
      }

      const links = [...nav.querySelectorAll('a')].map((link) => {
        const styles = getComputedStyle(link)
        return {
          ariaCurrent: link.getAttribute('aria-current'),
          borderBottomColor: styles.borderBottomColor,
          color: styles.color,
          contrast: contrast(rgba(styles.color), background),
          fontFamily: styles.fontFamily,
          fontSize: styles.fontSize,
          href: link.getAttribute('href'),
          label: link.textContent.trim(),
        }
      })

      return {
        accessibleName: nav.getAttribute('aria-label'),
        currentCount: nav.querySelectorAll('[aria-current="page"]').length,
        currentLabel: nav.querySelector('[aria-current="page"]')?.textContent.trim() ?? null,
        links,
        overflow: {
          document: document.documentElement.scrollWidth,
          navClient: nav.clientWidth,
          navScroll: nav.scrollWidth,
          viewport: window.innerWidth,
        },
        periods: [...document.querySelectorAll('nav[aria-label="Match history period"] a')]
          .map((link) => link.textContent.trim()),
        historyView: (() => {
          const view = document.querySelector('nav[aria-label="Match history view"]')
          if (!view) return null
          return {
            current: view.querySelector('[aria-current="page"]')?.textContent.trim() ?? null,
            links: [...view.querySelectorAll('a')].map((link) => ({
              href: link.getAttribute('href'),
              label: link.textContent.trim(),
            })),
          }
        })(),
        hasHeroWinRates: Boolean(document.querySelector('#hero-win-rates-heading')),
        hasRecentMatches: Boolean(document.querySelector('table[aria-label="Recent matches"]')),
        railHeight: nav.getBoundingClientRect().height,
        siblingLinks: ${
          route.name === 'hero-detail'
            ? `[...document.querySelectorAll('a')]
          .filter((link) => {
            const href = link.getAttribute('href')
            if (!href?.startsWith('/${username}/set/')) return false
            return Number.isInteger(Number(href.split('/').at(-1)))
          })
          .map((link) => ({ href: link.getAttribute('href'), label: link.textContent.trim() }))`
            : '[]'
        },
      }
    })()`)

    const axTree = await send('Accessibility.getFullAXTree')
    const axNavigation = axTree.nodes.some(
      (node) => node.role?.value === 'navigation' && node.name?.value === 'Profile sections',
    )

    let violations = []
    if (axeSource) {
      await evaluate(axeSource)
      const axeRoot =
        route.name === 'match-history' || route.name === 'hero-win-rates'
          ? `document.querySelector('[data-testid="match-history-page"]')`
          : `document.querySelector('nav[aria-label="Profile sections"]')`
      violations = await evaluate(
        `axe.run(${axeRoot}, {
          runOnly: {
            type: 'tag',
            values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'],
          },
          resultTypes: ['violations'],
        }).then(({ violations }) => violations.map(({ id, impact, help, nodes }) => ({
          help,
          id,
          impact,
          nodes: nodes.length,
        })))`,
        true,
      )
    }

    const screenshot = await send('Page.captureScreenshot', {
      captureBeyondViewport: false,
      format: 'png',
      fromSurface: true,
    })
    await fs.writeFile(
      path.join(outputDir, `${route.name}-${viewport.name}.png`),
      Buffer.from(screenshot.data, 'base64'),
    )

    const active = dom.links?.find((link) => link.ariaCurrent === 'page')
    const inactive = dom.links?.find((link) => link.ariaCurrent !== 'page')
    assert(!dom.error, `${route.path} ${viewport.name}: ${dom.error}`, failures)
    assert(
      axNavigation,
      `${route.path} ${viewport.name}: navigation missing from AX tree`,
      failures,
    )
    assert(
      dom.currentCount === 1,
      `${route.path} ${viewport.name}: expected one current link`,
      failures,
    )
    assert(
      dom.currentLabel === route.current,
      `${route.path} ${viewport.name}: current section is ${dom.currentLabel}`,
      failures,
    )
    assert(
      dom.links?.some((link) => link.href === `/${username}/matches`),
      `${route.path} ${viewport.name}: missing match-history link`,
      failures,
    )
    assert(
      dom.links?.some((link) => link.href === `/${username}/set`),
      `${route.path} ${viewport.name}: missing collection link`,
      failures,
    )
    assert(
      dom.links?.every(
        (link) => link.fontSize === '14px' && link.fontFamily.toLowerCase().includes('inter'),
      ),
      `${route.path} ${viewport.name}: typography drifted`,
      failures,
    )
    assert(
      dom.links?.every((link) => link.contrast >= 4.5),
      `${route.path} ${viewport.name}: text contrast below 4.5:1`,
      failures,
    )
    assert(
      dom.overflow.document <= dom.overflow.viewport,
      `${route.path} ${viewport.name}: document overflows horizontally`,
      failures,
    )
    assert(
      dom.railHeight <= 56,
      `${route.path} ${viewport.name}: profile rail is taller than 56px`,
      failures,
    )
    assert(
      active?.borderBottomColor !== 'rgba(0, 0, 0, 0)',
      `${route.path} ${viewport.name}: active underline missing`,
      failures,
    )
    assert(
      inactive?.borderBottomColor === 'rgba(0, 0, 0, 0)',
      `${route.path} ${viewport.name}: inactive underline is visible`,
      failures,
    )
    assert(
      active?.color !== inactive?.color,
      `${route.path} ${viewport.name}: active and inactive text colors match`,
      failures,
    )
    if (route.name === 'match-history' || route.name === 'hero-win-rates') {
      assert(
        ['7 days', '30 days', 'All time'].every((label) => dom.periods.includes(label)),
        `${route.path} ${viewport.name}: period controls changed`,
        failures,
      )
      assert(
        dom.historyView?.links.some((link) => link.label === 'Matches'),
        `${route.path} ${viewport.name}: matches view link missing`,
        failures,
      )
      assert(
        dom.historyView?.links.some((link) => link.label === 'Hero win rates'),
        `${route.path} ${viewport.name}: hero win-rates link missing`,
        failures,
      )
    }
    if (route.name === 'match-history') {
      assert(
        dom.historyView?.current === 'Matches',
        `${route.path} ${viewport.name}: matches view is not current`,
        failures,
      )
      assert(dom.hasRecentMatches, `${route.path} ${viewport.name}: match table missing`, failures)
      assert(
        !dom.hasHeroWinRates,
        `${route.path} ${viewport.name}: hero win rates rendered in matches view`,
        failures,
      )
    }
    if (route.name === 'hero-win-rates') {
      assert(
        dom.historyView?.current === 'Hero win rates',
        `${route.path} ${viewport.name}: hero win-rates view is not current`,
        failures,
      )
      assert(
        dom.hasHeroWinRates,
        `${route.path} ${viewport.name}: hero win rates missing`,
        failures,
      )
      assert(
        !dom.hasRecentMatches,
        `${route.path} ${viewport.name}: match table rendered in hero view`,
        failures,
      )
    }
    if (route.name === 'hero-detail') {
      assert(
        dom.siblingLinks.length >= 1,
        `${route.path} ${viewport.name}: hero sibling navigation missing`,
        failures,
      )
    }
    assert(
      violations.length === 0,
      `${route.path} ${viewport.name}: axe violations ${JSON.stringify(violations)}`,
      failures,
    )

    audits.push({
      axNavigation,
      expectedCurrent: route.current,
      route: route.path,
      viewport: viewport.name,
      violations,
      ...dom,
    })
  }
}

await send('Emulation.setDeviceMetricsOverride', {
  deviceScaleFactor: 1,
  height: 844,
  mobile: false,
  screenHeight: 844,
  screenWidth: 390,
  width: 390,
})
await navigate(`/${username}/matches`)
await evaluate(
  "document.body.tabIndex=-1; document.body.focus(); document.body.removeAttribute('tabindex')",
)

let keyboardFocus = null
for (let index = 0; index < 40; index += 1) {
  await send('Input.dispatchKeyEvent', { key: 'Tab', type: 'keyDown' })
  await send('Input.dispatchKeyEvent', { key: 'Tab', type: 'keyUp' })
  keyboardFocus = await evaluate(`(() => {
    const element = document.activeElement
    if (!element.closest('nav[aria-label="Profile sections"]')) return null
    const styles = getComputedStyle(element)
    return {
      focusVisible: element.matches(':focus-visible'),
      label: element.textContent.trim(),
      outlineColor: styles.outlineColor,
      outlineOffset: styles.outlineOffset,
      outlineStyle: styles.outlineStyle,
      outlineWidth: styles.outlineWidth,
    }
  })()`)
  if (keyboardFocus) break
}

assert(Boolean(keyboardFocus), 'Keyboard focus never reached profile navigation', failures)
assert(keyboardFocus?.focusVisible, 'Profile link does not match :focus-visible', failures)
assert(
  keyboardFocus && !['none', 'hidden'].includes(keyboardFocus.outlineStyle),
  'Profile link has no visible outline style',
  failures,
)
assert(
  keyboardFocus && Number.parseFloat(keyboardFocus.outlineWidth) >= 2,
  'Profile link focus outline is thinner than 2px',
  failures,
)

await evaluate(
  `document.querySelector('nav[aria-label="Profile sections"] a[href="/${username}/set"]').click()`,
)
await waitFor(
  `location.pathname === '/${username}/set' && document.querySelector('nav[aria-label="Profile sections"] [aria-current="page"]')?.textContent.trim() === 'Cosmetic collection'`,
  'collection navigation',
)
const toCollection = await evaluate(
  `({ path: location.pathname, current: document.querySelector('nav[aria-label="Profile sections"] [aria-current="page"]')?.textContent.trim() })`,
)
assert(toCollection.path === `/${username}/set`, 'Click did not navigate to collection', failures)
assert(
  toCollection.current === 'Cosmetic collection',
  'Collection did not become current',
  failures,
)

await evaluate(
  `document.querySelector('nav[aria-label="Profile sections"] a[href="/${username}/matches"]').click()`,
)
await waitFor(
  `location.pathname === '/${username}/matches' && document.querySelector('nav[aria-label="Profile sections"] [aria-current="page"]')?.textContent.trim() === 'Match history'`,
  'match-history navigation',
)
const toMatches = await evaluate(
  `({ path: location.pathname, current: document.querySelector('nav[aria-label="Profile sections"] [aria-current="page"]')?.textContent.trim() })`,
)
assert(toMatches.path === `/${username}/matches`, 'Click did not navigate to matches', failures)
assert(toMatches.current === 'Match history', 'Match history did not become current', failures)

await evaluate(
  `document.querySelector('nav[aria-label="Match history view"] a[href="/${username}/matches?view=heroes"]').click()`,
)
await waitFor(
  `location.pathname === '/${username}/matches' && location.search === '?view=heroes' && document.querySelector('nav[aria-label="Match history view"] [aria-current="page"]')?.textContent.trim() === 'Hero win rates'`,
  'hero win-rates navigation',
)
const toHeroWinRates = await evaluate(
  `({ path: location.pathname + location.search, current: document.querySelector('nav[aria-label="Match history view"] [aria-current="page"]')?.textContent.trim(), hasHeading: Boolean(document.querySelector('#hero-win-rates-heading')) })`,
)
assert(
  toHeroWinRates.path === `/${username}/matches?view=heroes`,
  'Click did not navigate to hero win rates',
  failures,
)
assert(
  toHeroWinRates.current === 'Hero win rates' && toHeroWinRates.hasHeading,
  'Hero win-rates view did not become current',
  failures,
)

await evaluate(
  `document.querySelector('nav[aria-label="Match history view"] a[href="/${username}/matches"]').click()`,
)
await waitFor(
  `location.pathname === '/${username}/matches' && location.search === '' && document.querySelector('nav[aria-label="Match history view"] [aria-current="page"]')?.textContent.trim() === 'Matches'`,
  'matches view navigation',
)
const backToMatchRows = await evaluate(
  `({ path: location.pathname + location.search, current: document.querySelector('nav[aria-label="Match history view"] [aria-current="page"]')?.textContent.trim(), hasTable: Boolean(document.querySelector('table[aria-label="Recent matches"]')) })`,
)
assert(
  backToMatchRows.path === `/${username}/matches`,
  'Click did not return to match rows',
  failures,
)
assert(
  backToMatchRows.current === 'Matches' && backToMatchRows.hasTable,
  'Matches view did not become current',
  failures,
)

const report = {
  audits,
  axeEnabled: Boolean(axeSource),
  keyboardFocus,
  navigationJourney: { backToMatchRows, toCollection, toHeroWinRates, toMatches },
  outputDir,
  profileAudits,
}
await fs.writeFile(
  path.join(outputDir, 'profile-navigation-audit.json'),
  `${JSON.stringify(report, null, 2)}\n`,
)
console.log(JSON.stringify(report, null, 2))
socket.close()

if (failures.length > 0) {
  throw new AggregateError(
    failures.map((message) => new Error(message)),
    'Profile audit failed',
  )
}
