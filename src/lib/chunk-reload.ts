// A deploy replaces the page chunks, and a page still pointing at the old ones fails to import
// them (Sentry DOTABOD-FRONTEND-15E). OBS keeps overlays open across deploys, and pages that
// load within a minute or so of a deploy hit the same error on their own page chunk. Either way
// the page is broken until it is refreshed, so reload it to fetch the current HTML and chunks.
// The timestamp stops a reload loop when a chunk is missing for another reason.
const LAST_RELOAD_KEY = 'dotabod:chunk-reload-at'
const MIN_RELOAD_INTERVAL_MS = 60_000

export const reloadAfterChunkError = function reloadAfterChunkError(
  location: Pick<Location, 'reload'>,
  storage: Pick<Storage, 'getItem' | 'setItem'>,
  now: number,
) {
  if (now - Number(storage.getItem(LAST_RELOAD_KEY)) < MIN_RELOAD_INTERVAL_MS) {
    return
  }
  storage.setItem(LAST_RELOAD_KEY, String(now))
  location.reload()
}

// Vite's preload helper dispatches vite:preloadError when a page chunk or one of its
// dependencies fails to load. The error still propagates, so Sentry keeps recording it.
export const reloadOnChunkError = function reloadOnChunkError() {
  if (!('window' in globalThis)) {
    return
  }
  window.addEventListener('vite:preloadError', () => {
    reloadAfterChunkError(window.location, window.sessionStorage, Date.now())
  })
}
