import path from 'node:path'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite-plus'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '.prisma-mongo/client': path.resolve(__dirname, './node_modules/.prisma-mongo/client'),
      '@': path.resolve(__dirname, './src'),
    },
  },
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
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
    },
  },
})
