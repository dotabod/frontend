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
  'af',
  'ar',
  'ca',
  'cs',
  'da',
  'de',
  'el',
  'es',
  'fa',
  'fi',
  'fr',
  'he',
  'hu',
  'it',
  'ja',
  'ko',
  'nl',
  'no',
  'pl',
  'pt-BR',
  'pt',
  'ro',
  'ru',
  'sr',
  'sv-SE',
  'tr',
  'uk-UA',
  'vi',
  'zh-CN',
  'zh-TW',
  'en',
])
