import { describe, expect, it } from 'vitest'

import { getLanguageProgressUrl } from '@/lib/hooks/use-language-translation'

describe(getLanguageProgressUrl, () => {
  it('builds the kebab-case language progress API route', () => {
    expect(getLanguageProgressUrl('ru-RU')).toBe('/api/get-language-progress?languageId=ru-RU')
  })

  it('disables the request when no language is selected', () => {
    expect(getLanguageProgressUrl('')).toBeNull()
  })
})
