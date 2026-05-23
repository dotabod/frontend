import { defineConfig } from 'vite-plus'

export default defineConfig({
  fmt: {
    jsxSingleQuote: true,
    semi: false,
    singleQuote: true,
  },
  lint: {
    categories: {
      correctness: 'error',
      // nursery: 'warn',
      // pedantic: 'warn',
      // perf: 'warn',
      // restriction: 'warn',
      // style: 'warn',
      // suspicious: 'warn',
    },
    env: {
      builtin: true,
      browser: true,
    },
    jsPlugins: [
      {
        name: 'vite-plus',
        specifier: 'vite-plus/oxlint-plugin',
      },
    ],
    options: {
      maxWarnings: 2,
      typeAware: true,
      typeCheck: true,
      respectEslintDisableDirectives: true,
      reportUnusedDisableDirectives: 'error',
    },
    plugins: ['typescript', 'unicorn', 'oxc'],
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
      'vite-plus/prefer-vite-plus-imports': 'error',
    },
    overrides: [
      {
        files: ['src/__tests__/**', '**/*.test.ts', '**/*.test.tsx'],
        rules: {
          'typescript/unbound-method': 'off',
          'typescript/no-floating-promises': 'off',
          'typescript/no-base-to-string': 'off',
          'typescript/restrict-template-expressions': 'off',
          'typescript/no-misused-spread': 'off',
        },
      },
      {
        files: ['scripts/**'],
        rules: {
          'typescript/no-floating-promises': 'off',
          'typescript/restrict-template-expressions': 'off',
          'typescript/no-base-to-string': 'off',
        },
      },
    ],
  },
})
