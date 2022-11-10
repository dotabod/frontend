import * as z from 'zod'

export const settingPatchSchema = z.object({
  key: z.string().min(3).max(128).optional(),

  // TODO: Type this properly from editorjs block types?
  value: z.any().optional(),
})
