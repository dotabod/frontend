import * as z from 'zod'

export const settingPatchSchema = z.object({
  key: z.string().min(3).max(128).optional(),
  value: z.any().optional(),
})

export const mmrPatchSchema = z.object({
  value: z.number().min(0).max(20000),
})

export const localePatchSchema = z.enum([
  'cs-SK',
  'en',
  'es',
  'it',
  'pt',
  'pt-BR',
  'ru',
  'uk-UA',
])
