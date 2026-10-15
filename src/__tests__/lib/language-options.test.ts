import { describe, expect, it } from 'vitest'

import { languageOptions } from '@/lib/language-options'
import { localePatchSchema } from '@/lib/validations/setting'

const labels = languageOptions.map((option) => option.label)

describe('languageOptions', () => {
  it('offers exactly the locales the settings API accepts, with no Crowdin data', () => {
    const offered = languageOptions.map((option) => option.value)

    expect(offered).toHaveLength(localePatchSchema.options.length)
    expect(new Set(offered)).toStrictEqual(new Set(localePatchSchema.options))
  })

  it('includes the languages most streamers use', () => {
    expect(languageOptions).toContainEqual({ label: 'English', value: 'en' })
    expect(languageOptions).toContainEqual({ label: 'Russian', value: 'ru-RU' })
    expect(languageOptions).toContainEqual({ label: 'Ukrainian', value: 'uk-UA' })
  })

  it('tells regional variants of the same language apart', () => {
    expect(new Set(labels).size).toBe(labels.length)
    expect(languageOptions).toContainEqual({ label: 'Portuguese (Brazil)', value: 'pt-BR' })
    expect(languageOptions).toContainEqual({ label: 'Portuguese (Portugal)', value: 'pt-PT' })
  })

  it('lists the languages alphabetically by label', () => {
    expect(labels).toStrictEqual([...labels].sort((a, b) => a.localeCompare(b)))
  })
})
