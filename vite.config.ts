import { fileURLToPath } from 'node:url'

import { cloudflare } from '@cloudflare/vite-plugin'
import vinext from 'vinext'
import { defineConfig } from 'vite'

export default defineConfig({
  legacy: {
    inconsistentCjsInterop: true,
  },
  plugins: [vinext(), cloudflare()],
  resolve: {
    alias: {
      '@/lib/db': fileURLToPath(new URL('./src/lib/db.cloudflare.ts', import.meta.url)),
      '@ant-design/cssinjs': '@ant-design/cssinjs/lib',
    },
  },
})
