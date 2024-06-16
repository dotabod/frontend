const config = {
  plugins: {
    'tailwindcss/nesting': {},
    tailwindcss: {},
    'postcss-focus-visible': {
      replaceWith: '[data-focus-visible-added]',
    },
    autoprefixer: {},
  },
}

export default config
