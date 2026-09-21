import { cloudflare } from '@cloudflare/vite-plugin'
import vinext from 'vinext'
import { defineConfig } from 'vite'

import nextConfig from './next.config.mjs'

export default defineConfig({
  plugins: [vinext({ nextConfig: { ...nextConfig, output: undefined } }), cloudflare()],
  resolve: {
    alias: {
      '@ant-design/cssinjs': '@ant-design/cssinjs/lib',
    },
  },
})
