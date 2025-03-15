import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'node:path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'happy-dom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'vitest.setup.ts',
        '**/*.d.ts',
        '**/*.config.*',
        '**/dist/**',
        '**/__tests__/**',
      ],
      include: ['src/components/Overlay/GiftAlert/GiftSubscriptionAlert.tsx'],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
