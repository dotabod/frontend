const { initReactI18next } = require('react-i18next')

module.exports = {
  debug: process.env.NODE_ENV === 'development',
  i18n: {
    defaultLocale: 'en',
    locales: [
      'en',
      'af-ZA',
      'ar-SA',
      'ca-ES',
      'cs-CZ',
      'da-DK',
      'de-DE',
      'el-GR',
      'es-ES',
      'fa-IR',
      'fi-FI',
      'fr-FR',
      'he-IL',
      'hu-HU',
      'it-IT',
      'ja-JP',
      'ko-KR',
      'nl-NL',
      'no-NO',
      'pl-PL',
      'pt-BR',
      'pt-PT',
      'ro-RO',
      'ru-RU',
      'sr-SP',
      'sv-SE',
      'tr-TR',
      'uk-UA',
      'vi-VN',
      'zh-CN',
      'zh-TW',
    ],
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
