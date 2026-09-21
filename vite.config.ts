import { fileURLToPath } from 'node:url'

import { cloudflare } from '@cloudflare/vite-plugin'
import vinext from 'vinext'
import { defineConfig } from 'vite'

const cloudflareDbPath = fileURLToPath(new URL('src/lib/db.cloudflare.ts', import.meta.url))
const nodeDbPath = fileURLToPath(new URL('src/lib/db.ts', import.meta.url))

export default defineConfig({
  legacy: {
    inconsistentCjsInterop: true,
  },
  plugins: [vinext(), cloudflare()],
  resolve: {
    alias: [
      { find: '@/lib/db', replacement: cloudflareDbPath },
      { find: nodeDbPath, replacement: cloudflareDbPath },
      { find: '@ant-design/cssinjs', replacement: '@ant-design/cssinjs/lib' },
    ],
  },
})
