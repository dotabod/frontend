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
  'cs',
  'en',
  'es',
  'it',
  'pt',
  'pt-BR',
  'ru',
  'hu',
  'fa',
  'uk-UA',
  'tr',
  'gr',
])
