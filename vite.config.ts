import { defineConfig } from 'vite-plus'

export default defineConfig({
  fmt: {
    jsxSingleQuote: true,
    printWidth: 100,
    semi: false,
    singleQuote: true,
    trailingComma: 'all',
    useTabs: false,
  },
  lint: {
    categories: {
      correctness: 'error',
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
    plugins: ['typescript', 'unicorn', 'oxc', 'react', 'jsx-a11y', 'react-perf', 'nextjs'],
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
      'jsx-a11y/prefer-tag-over-role': 'off',
      'nextjs/no-img-element': 'off',
      'react-hooks/exhaustive-deps': 'off',
      'typescript/no-explicit-any': 'error',
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
          'typescript/no-explicit-any': 'off',
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
