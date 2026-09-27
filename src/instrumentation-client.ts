// This file configures the initialization of Sentry on the client.
// The config you add here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from '@sentry/nextjs'

import { dropExtensionNoise } from '@/lib/sentry-client-filters'
import { guardDomAgainstTranslation } from '@/lib/translate-dom-guard'

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart

guardDomAgainstTranslation()

const SENTRY_DSN = process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN

const replay = Sentry.replayIntegration({
  blockAllMedia: false,
  maskAllText: false,
})

const handleNavigation = function handleNavigation(url: URL) {
  try {
    if (url.pathname.startsWith('/overlay')) {
      void replay.stop()
    } else {
      replay.start()
    }
  } catch {
    // Sentry.captureException(e)
  }
}

if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,

    // Use tracesSampler for more granular control over sampling
    tracesSampleRate: 0.5,

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

    // Auto-installer polls http://localhost:<port>/status until the local
    // helper is running. Failures are expected and handled at the call site
    // (WindowsInstaller.tsx), but extensions that wrap window.fetch can
    // surface them as global unhandled rejections.
    ignoreErrors: [
      /Failed to fetch \(localhost:/iu,
      /NetworkError when attempting to fetch resource\.? \(localhost:/iu,
    ],
    beforeSend: dropExtensionNoise,
  })

  if (typeof window !== 'undefined') {
    // vinext doesn't fire a navigation for the initial page load, so the
    // listener below never sees an overlay that OBS opens directly.
    if (window.location.pathname.startsWith('/overlay')) {
      void replay.stop()
    }

    if (window.navigation) {
      // Use the Navigation API if available
      window.navigation.addEventListener(
        'navigate',
        (event: Event & { destination: { url: string } }) => {
          const url = new URL(event.destination.url)
          handleNavigation(url)
        },
      )
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
