// This file sets a custom webpack configuration to use your Next.js app
// with Sentry.
// https://nextjs.org/docs/api-reference/next.config.js/introduction
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

const { withSentryConfig } = require('@sentry/nextjs')

const moduleExports = {
  // Your existing module.exports
  productionBrowserSourceMaps: true,
  reactStrictMode: true,
  experimental: {
    scrollRestoration: true,
  },

  images: {
    domains: [
      'avatars.steamstatic.com',
      'static-cdn.jtvnw.net',
      'i.imgur.com',
      'cdn.7tv.app',
      'cdn.frankerfacez.com',
      'cdn.betterttv.net',
      'avatars.akamai.steamstatic.com',
      'avatars.cloudflare.steamstatic.com',
    ],
  },

  sentry: {
    release: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA,
    autoInstrumentMiddleware: !!process.env.NEXT_PUBLIC_SENTRY_DSN,
    disableServerWebpackPlugin: !process.env.NEXT_PUBLIC_SENTRY_DSN,
    disableClientWebpackPlugin: !process.env.NEXT_PUBLIC_SENTRY_DSN,
  },
}

const sentryWebpackPluginOptions = {
  // Additional config options for the Sentry Webpack plugin. Keep in mind that
  // the following options are set automatically, and overriding them is not
  // recommended:
  //   release, url, org, project, authToken, configFile, stripPrefix,
  //   urlPrefix, include, ignore

  release: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA,
  autoInstrumentMiddleware: !!process.env.NEXT_PUBLIC_SENTRY_DSN,
  disableServerWebpackPlugin: !process.env.NEXT_PUBLIC_SENTRY_DSN,
  disableClientWebpackPlugin: !process.env.NEXT_PUBLIC_SENTRY_DSN,
  silent: true, // Suppresses all logs
  // For all available options, see:
  // https://github.com/getsentry/sentry-webpack-plugin#options.
}

// Make sure adding Sentry options is the last code to run before exporting, to
// ensure that your source maps include changes from all other Webpack plugins
module.exports = withSentryConfig(moduleExports, sentryWebpackPluginOptions)
