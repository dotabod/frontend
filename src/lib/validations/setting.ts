import * as z from 'zod'

export const settingPatchSchema = z.object({
  key: z.string().min(3).max(128).optional(),
  value: z.any().optional(),
})

export const mmrPatchSchema = z.object({
  value: z.number().min(0).max(20000),
})

export const streamDelaySchema = z.object({
  value: z.number().min(0).max(60000),
})

export const localePatchSchema = z.enum([
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
  'en',
])
