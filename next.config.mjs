// @ts-check

// This file sets a custom webpack configuration to use your Next.js app
// with Sentry.
// https://nextjs.org/docs/api-reference/next.config.js/introduction
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import { withSentryConfig } from '@sentry/nextjs'

/**
 * @type {import('next').NextConfig}
 */
const nextConfig = {
  productionBrowserSourceMaps: true,
  reactStrictMode: true,
  env: {
    NEXT_PUBLIC_IS_IN_MAINTENANCE_MODE: process.env.IS_IN_MAINTENANCE_MODE,
  },
  async redirects() {
    return [
      {
        source: '/install',
        destination: '/api/install',
        permanent: false,
      },
      {
        source: '/dashboard/troubleshoot',
        destination: '/dashboard/help',
        permanent: false,
      },
    ]
  },
  experimental: {
    forceSwcTransforms: false,
    turbo: {
      resolveAlias: {
        '@ant-design/cssinjs': '@ant-design/cssinjs/lib',
      },
    },
  },
  // Fix for Prisma engine not found error
  output: 'standalone',
  // Tell Next.js to copy the Prisma engines to the standalone output
  outputFileTracingExcludes: {
    '*': [
      'node_modules/@swc/core-linux-x64-gnu',
      'node_modules/@swc/core-linux-x64-musl',
      'node_modules/esbuild-linux-64/bin',
    ],
  },
  outputFileTracingIncludes: {
    '*': [
      'node_modules/.prisma/**/*',
      'node_modules/.prisma-mongo/**/*',
      'node_modules/@prisma/client/**/*',
      '.prisma/client/**/*',
      '.prisma-mongo/client/**/*',
    ],
  },
  transpilePackages: [
    '@ant-design',
    '@ant-design/cssinjs',
    '@rc-component/async-validator',
    '@rc-component/color-picker',
    '@rc-component/context',
    '@rc-component/mini-decimal',
    '@rc-component/mutate-observer',
    '@rc-component/portal',
    '@rc-component/qrcode',
    '@rc-component/tour',
    '@rc-component/util',
    '@rc-component/trigger',
    'antd',
    'rc-input-number',
    'rc-input',
    'rc-mentions',
    'rc-menu',
    'rc-motion',
    'rc-notification',
    'rc-pagination',
    'rc-picker',
    'rc-table',
    'rc-textarea',
    'rc-tooltip',
    'rc-tree',
    'rc-util',
  ],
  webpack: (config, { dev, isServer }) => {
    // Fix for the "Cannot read properties of null (reading '1')" error in production
    if (!dev && !isServer) {
      Object.assign(config.resolve.alias, {
        '@ant-design/cssinjs': '@ant-design/cssinjs/lib',
      })
    }
    return config
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'avatars.steamstatic.com',
      },
      {
        protocol: 'https',
        hostname: 'static-cdn.jtvnw.net',
      },
      {
        protocol: 'https',
        hostname: 'i.imgur.com',
      },
      {
        protocol: 'https',
        hostname: 'cdn.7tv.app',
      },
      {
        protocol: 'https',
        hostname: 'lastfm.freetls.fastly.net',
      },
      {
        protocol: 'https',
        hostname: 'cdn.frankerfacez.com',
      },
      {
        protocol: 'https',
        hostname: 'cdn.betterttv.net',
      },
      {
        protocol: 'https',
        hostname: 'avatars.akamai.steamstatic.com',
      },
      {
        protocol: 'https',
        hostname: 'avatars.cloudflare.steamstatic.com',
      },
    ],
  },
}

export default withSentryConfig(
  withSentryConfig(nextConfig, {
    // For all available options, see:
    // https://github.com/getsentry/sentry-webpack-plugin#options

    org: 'mgates-llc',
    project: 'dotabod-frontend',

    release: {
      name: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA,
    },

    // Only print logs for uploading source maps in CI
    silent: !process.env.CI,

    // For all available options, see:
    // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

    // Upload a larger set of source maps for prettier stack traces (increases build time)
    widenClientFileUpload: true,

    // Comment out the property that's causing the linter error
    // transpileClientSDK: true,

    // Hides source maps from generated client bundles
    sourcemaps: {
      assets: './**/*.map',
      deleteSourcemapsAfterUpload: true,
    },

    // Automatically annotate React components to show their full name in breadcrumbs and session replay
    reactComponentAnnotation: {
      enabled: true,
    },

    // Uncomment to route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers.
    // This can increase your server load as well as your hosting bill.
    // Note: Check that the configured route will not match with your Next.js middleware, otherwise reporting of client-
    // side errors will fail.
    // tunnelRoute: "/monitoring",

    // Automatically tree-shake Sentry logger statements to reduce bundle size
    disableLogger: true,

    // Enables automatic instrumentation of Vercel Cron Monitors. (Does not yet work with App Router route handlers.)
    // See the following for more information:
    // https://docs.sentry.io/product/crons/
    // https://vercel.com/docs/cron-jobs
    automaticVercelMonitors: true,
  }),
)
