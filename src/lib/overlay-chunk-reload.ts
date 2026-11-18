// OBS keeps an overlay open across deploys. Once a deploy replaces the chunks that the old page
// points at, its next dynamic import fails (Sentry DOTABOD-FRONTEND-15E) and the overlay stays
// blank until the streamer refreshes the browser source. Nobody watches an overlay, so reload it
// to fetch the current HTML and chunks. The timestamp stops a reload loop when a chunk is missing
// for another reason.
const LAST_RELOAD_KEY = 'dotabod:overlay-chunk-reload-at'
const MIN_RELOAD_INTERVAL_MS = 60_000

export const reloadOverlayAfterChunkError = function reloadOverlayAfterChunkError(
  location: Pick<Location, 'pathname' | 'reload'>,
  storage: Pick<Storage, 'getItem' | 'setItem'>,
  now: number,
) {
  if (!location.pathname.startsWith('/overlay')) {
    return
  }
  if (now - Number(storage.getItem(LAST_RELOAD_KEY)) < MIN_RELOAD_INTERVAL_MS) {
    return
  }
  storage.setItem(LAST_RELOAD_KEY, String(now))
  location.reload()
}

// Vite's preload helper dispatches vite:preloadError when a page chunk or one of its
// dependencies fails to load. The error still propagates, so Sentry keeps recording it.
export const reloadOverlayOnChunkError = function reloadOverlayOnChunkError() {
  if (!('window' in globalThis)) {
    return
  }
  window.addEventListener('vite:preloadError', () => {
    reloadOverlayAfterChunkError(window.location, window.sessionStorage, Date.now())
  })
}
