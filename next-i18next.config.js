const { initReactI18next } = require('react-i18next')

module.exports = {
  debug: process.env.NODE_ENV === 'development',
  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'ru'],
  },
  /** To avoid issues when deploying to some paas (vercel...) */
  localePath:
    typeof window === 'undefined'
      ? require('path').resolve('./public/locales')
      : '/locales',
  reloadOnPrerender: process.env.NODE_ENV === 'development',
  fallbackLng: {
    default: ['en'],
  },
}
