import { defineConfig } from 'oxfmt'
import ultracite from 'ultracite/oxfmt'

export default defineConfig({
  ...ultracite,
  ignorePatterns: [
    ...(ultracite.ignorePatterns ?? []),
    '.agents/**',
    '.claude/**',
    '.cursor/**',
    '.impeccable/**',
    'supabase/.temp/**',
  ],
  jsxSingleQuote: true,
  printWidth: 100,
  semi: false,
  singleQuote: true,
  trailingComma: 'all',
})
