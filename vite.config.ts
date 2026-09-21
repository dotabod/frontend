import { cloudflare } from '@cloudflare/vite-plugin'
import vinext from 'vinext'
import { defineConfig } from 'vite'

import nextConfig from './next.config.mjs'

const { output: _standaloneOutput, ...vinextNextConfig } = nextConfig

export default defineConfig({
  plugins: [vinext({ nextConfig: vinextNextConfig }), cloudflare()],
  resolve: {
    alias: {
      '@ant-design/cssinjs': '@ant-design/cssinjs/lib',
    },
  },
})
