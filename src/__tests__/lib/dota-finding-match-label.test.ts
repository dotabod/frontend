import { describe, expect, it } from 'vitest'

import { getDotaFindingMatchLabel } from '@/lib/dota-finding-match-label'

describe(getDotaFindingMatchLabel, () => {
  it.each([
    ['en', 'Finding Match'],
    ['de-DE', 'Partie wird gesucht'],
    ['es-ES', 'Buscando partida'],
    ['fr-FR', 'Recherche de match'],
    ['ru-RU', 'Поиск игры'],
    ['uk-UA', 'Пошук матчу'],
    ['zh-CN', '寻找比赛'],
    ['zh-TW', '搜尋比賽中'],
  ])('uses Dota localization for %s', (locale, expected) => {
    expect(getDotaFindingMatchLabel(locale)).toBe(expected)
  })

  it('falls back to Dota English for missing or unsupported locales', () => {
    expect(getDotaFindingMatchLabel()).toBe('Finding Match')
    expect(getDotaFindingMatchLabel('ar-SA')).toBe('Finding Match')
  })
})
