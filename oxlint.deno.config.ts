import { defineConfig } from 'oxlint'
import antiSlop from 'ultracite/oxlint/anti-slop'
import core from 'ultracite/oxlint/core'
import { jsPluginSettings, selectJsPlugins } from 'ultracite/oxlint/js-plugins'
import next from 'ultracite/oxlint/next'
import nextJsPlugins from 'ultracite/oxlint/next/js-plugins'
import react from 'ultracite/oxlint/react'
import vitest from 'ultracite/oxlint/vitest'

const jsPlugins = selectJsPlugins(['sonarjs', 'react-doctor'])

// Supabase Edge Functions run in Deno rather than the app's Node/tsgo runtime.
// Keep the same Ultracite policy but skip only incompatible type analysis.
export default defineConfig({
  env: {
    worker: true,
  },
  extends: [core, react, next, vitest, antiSlop, jsPlugins, nextJsPlugins],
  globals: {
    Deno: 'readonly',
  },
  ignorePatterns: [
    ...(core.ignorePatterns ?? []),
    '.agents/**',
    '.claude/**',
    '.cursor/**',
    '.impeccable/**',
    'supabase/.temp/**',
  ],
  jsPlugins: jsPlugins.jsPlugins ?? [],
  options: {
    reportUnusedDisableDirectives: 'error',
    respectEslintDisableDirectives: true,
    typeAware: false,
    typeCheck: false,
  },
  rules: {
    'no-unused-vars': [
      'error',
      {
        argsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
        destructuredArrayIgnorePattern: '^_',
        varsIgnorePattern: '^_',
      },
    ],
    'typescript/no-explicit-any': 'error',
  },
  settings: jsPluginSettings,
})
