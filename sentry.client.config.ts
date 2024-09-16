// This file configures the initialization of Sentry on the client.
// The config you add here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from '@sentry/nextjs'

const SENTRY_DSN =
  'process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN'

if (SENTRY_DSN) {
  const replay = Sentry.replayIntegration({
    maskAllText: false,
    blockAllMedia: false,
  })

  Sentry.init({
    dsn: SENTRY_DSN,

    // Adjust this value in production, or use tracesSampler for greater control
    tracesSampleRate: 1,

    // Setting this option to true will print useful information to the console while you're setting up Sentry.
    debug: true,

    /**
     * Initialize the Sentry SDK as normal.
     *
     * `replaysSessionSampleRate` and `replaysOnErrorSampleRate` are both set to
     * "0" so that we have manual control over session-based replays
     */
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0,
    integrations: [replay],
  })

  window.navigation.addEventListener('navigate', (event) => {
    const url = new URL(event.destination.url)
    if (!url.pathname.startsWith('/overlay')) {
      replay.start()
    }
  })
}
