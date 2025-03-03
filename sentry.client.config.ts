// This file configures the initialization of Sentry on the client.
// The config you add here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from '@sentry/nextjs'

const SENTRY_DSN = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN

const replay = Sentry.replayIntegration({
  maskAllText: false,
  blockAllMedia: false,
})

function handleNavigation(url: URL) {
  try {
    if (url.pathname.startsWith('/overlay')) {
      replay.stop()
    } else {
      replay.start()
    }
  } catch (e) {
    // Sentry.captureException(e)
  }
}

if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,

    // Use tracesSampler for more granular control over sampling
    tracesSampleRate: 0.1,
    // Capture errors based on environment
    release: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA,

    // Setting this option to true will print useful information to the console while you're setting up Sentry.
    debug: false,

    /**
     * Initialize the Sentry SDK as normal.
     *
     * `replaysSessionSampleRate` and `replaysOnErrorSampleRate` are both set to
     * "0" so that we have manual control over session-based replays
     */
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 1,
    integrations: [replay],
  })

  if (typeof window !== 'undefined') {
    if (window.navigation) {
      // Use the Navigation API if available
      window.navigation.addEventListener('navigate', (event) => {
        const url = new URL(event.destination.url)
        handleNavigation(url)
      })
    } else {
      // Fallback for browsers that do not support the Navigation API
      const handleFallbackNavigation = () => {
        const url = new URL(window.location.href)
        handleNavigation(url)
      }

      window.addEventListener('popstate', handleFallbackNavigation)
      window.addEventListener('hashchange', handleFallbackNavigation)
    }
  }
}
