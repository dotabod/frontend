const config = {
  plugins: {
    '@csstools/postcss-oklab-function': { preserve: true },
    '@tailwindcss/postcss': {},
    'postcss-focus-visible': {
      replaceWith: '[data-focus-visible-added]',
    },
  },
}

export default config
