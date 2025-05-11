const config = {
  plugins: {
    '@tailwindcss/postcss': {},
    '@csstools/postcss-oklab-function': { preserve: true },
    'postcss-focus-visible': {
      replaceWith: '[data-focus-visible-added]',
    },
  },
}

export default config
