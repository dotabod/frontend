const config = {
  plugins: {
    '@tailwindcss/postcss': {},
    'postcss-focus-visible': {
      replaceWith: '[data-focus-visible-added]',
    },
  },
}

export default config
