import { cloudflare } from '@cloudflare/vite-plugin'
import vinext, { type NextConfig } from 'vinext'
import { defineConfig } from 'vite'

import nextConfig from './next.config.mjs'

const { output: _standaloneOutput, ...vinextNextConfig } = nextConfig
const cloudflareNextConfig = vinextNextConfig as unknown as NextConfig

export default defineConfig({
  plugins: [vinext({ nextConfig: cloudflareNextConfig }), cloudflare()],
  resolve: {
    alias: {
      '@ant-design/cssinjs': '@ant-design/cssinjs/lib',
    },
  },
})
