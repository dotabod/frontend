import { localePatchSchema } from '@/lib/validations/setting'

type SupportedLocale = (typeof localePatchSchema.options)[number]

// Keyed by the locales the settings API accepts, which are the locale folders the bot ships,
// so adding a locale there without a name here fails the typecheck.
const languageNames: Record<SupportedLocale, string> = {
  'af-ZA': 'Afrikaans',
  'ar-SA': 'Arabic',
  'ca-ES': 'Catalan',
  'cs-CZ': 'Czech',
  'da-DK': 'Danish',
  'de-DE': 'German',
  'el-GR': 'Greek',
  en: 'English',
  'es-ES': 'Spanish',
  'fa-IR': 'Persian',
  'fi-FI': 'Finnish',
  'fr-FR': 'French',
  'he-IL': 'Hebrew',
  'hu-HU': 'Hungarian',
  'it-IT': 'Italian',
  'ja-JP': 'Japanese',
  'ko-KR': 'Korean',
  'nl-NL': 'Dutch',
  'no-NO': 'Norwegian',
  'pl-PL': 'Polish',
  'pt-BR': 'Portuguese (Brazil)',
  'pt-PT': 'Portuguese (Portugal)',
  'ro-RO': 'Romanian',
  'ru-RU': 'Russian',
  'sr-SP': 'Serbian',
  'sv-SE': 'Swedish',
  'th-TH': 'Thai',
  'tl-PH': 'Tagalog',
  'tr-TR': 'Turkish',
  'uk-UA': 'Ukrainian',
  'vi-VN': 'Vietnamese',
  'zh-CN': 'Chinese (Simplified)',
  'zh-TW': 'Chinese (Traditional)',
}

export const languageOptions = localePatchSchema.options
  .map((value) => ({ label: languageNames[value], value }))
  .sort((a, b) => a.label.localeCompare(b.label))
