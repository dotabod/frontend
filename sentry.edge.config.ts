// This file configures the initialization of Sentry for edge features (middleware, edge routes, and so on).
// The config you add here will be used whenever one of the edge features is loaded.
// Note that this config is unrelated to the Vercel Edge Runtime and is also required when running locally.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from '@sentry/nextjs'

const SENTRY_DSN = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN
const isProduction = process.env.NODE_ENV === 'production'
const defaultEdgeTraceSampleRate = isProduction ? 0.02 : 1

if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,

    // Define how likely traces are sampled. Adjust this value in production, or use tracesSampler for greater control.
    tracesSampleRate: defaultEdgeTraceSampleRate,
    tracesSampler: (samplingContext) => {
      if (!isProduction) {
        return 1
      }

      const requestUrl = samplingContext.normalizedRequest?.url
      if (typeof requestUrl === 'string' && requestUrl.includes('/api/settings')) {
        return 0
      }

      return defaultEdgeTraceSampleRate
    },

    // Setting this option to true will print useful information to the console while you're setting up Sentry.
    debug: false,
  })
}
