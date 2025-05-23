import path from 'node:path'
import react from '@vitejs/plugin-react'
import { loadEnv } from 'vite'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'happy-dom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    // Automatically restore mocks between tests
    mockReset: true,
    // Automatically restore stubbed environment variables between tests
    unstubEnvs: true,
    // Load environment variables from .env files
    env: loadEnv('', process.cwd(), ''),
    exclude: ['.next/', 'node_modules/', '.api/', 'vitest.setup.ts', '**/*.d.ts', '**/*.config.*'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        '.next/',
        'node_modules/',
        '.api/',
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
      '.prisma-mongo/client': path.resolve(__dirname, './node_modules/.prisma-mongo/client'),
    },
  },
})
