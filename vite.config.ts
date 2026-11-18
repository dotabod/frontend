import { cloudflare } from '@cloudflare/vite-plugin'
import { sentryVitePlugin } from '@sentry/vite-plugin'
import vinext from 'vinext'
import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    // Hidden maps leave no sourceMappingURL in the bundle. Sentry matches them to
    // Stack frames by the debug ID the plugin below injects.
    sourcemap: 'hidden',
  },
  legacy: {
    inconsistentCjsInterop: true,
  },
  plugins: [
    vinext(),
    cloudflare(),
    // Without SENTRY_AUTH_TOKEN it skips the upload but still deletes the maps,
    // So a build never deploys them as public assets.
    sentryVitePlugin({
      authToken: process.env.SENTRY_AUTH_TOKEN,
      org: 'mgates-llc',
      project: 'dotabod-frontend',
      // The release withSentryConfig in next.config.mjs stamps on events. Both fall
      // Back to the git commit SHA when this is unset.
      release: { name: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA },
      sourcemaps: { filesToDeleteAfterUpload: ['./dist/**/*.map'] },
    }),
  ],
  resolve: {
    alias: {
      '@ant-design/cssinjs': '@ant-design/cssinjs/lib',
    },
  },
})
