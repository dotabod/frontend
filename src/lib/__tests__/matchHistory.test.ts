import { describe, expect, it } from 'vitest'
import {
  buildHeroPerformance,
  buildMatchHistorySummary,
  decodeMatchHistoryCursor,
  encodeMatchHistoryCursor,
  formatQueueLabel,
  formatStreamerScore,
  readKda,
} from '@/lib/matchHistory'

const heroes = {
  '1': {
    icon: '/heroes/icons/antimage.png?',
    localized_name: 'Anti-Mage',
    name: 'npc_dota_hero_antimage',
  },
  '2': {
    icon: '/heroes/icons/axe.png?',
    localized_name: 'Axe',
    name: 'npc_dota_hero_axe',
  },
}

describe('match history helpers', () => {
  it('builds an overall record from resolved hero groups', () => {
    const summary = buildMatchHistorySummary([
      { count: 3, heroName: 'npc_dota_hero_axe', won: true },
      { count: 2, heroName: 'npc_dota_hero_axe', won: false },
      { count: 1, heroName: 'npc_dota_hero_antimage', won: true },
      { count: 1, heroName: null, won: false },
    ])

    expect(summary).toEqual({
      heroesPlayed: 2,
      losses: 3,
      matches: 7,
      winRate: 57,
      wins: 4,
    })
  })

  it('localizes heroes, combines results, and sorts by games played', () => {
    const performance = buildHeroPerformance(
      [
        { count: 2, heroName: 'npc_dota_hero_antimage', won: false },
        { count: 4, heroName: 'npc_dota_hero_axe', won: true },
        { count: 1, heroName: 'npc_dota_hero_antimage', won: true },
        { count: 1, heroName: 'npc_dota_hero_axe', won: false },
      ],
      heroes,
    )

    expect(performance).toEqual([
      {
        heroImage: 'https://cdn.cloudflare.steamstatic.com/heroes/icons/axe.png?',
        heroKey: 'npc_dota_hero_axe',
        heroName: 'Axe',
        losses: 1,
        matches: 5,
        winRate: 80,
        wins: 4,
      },
      {
        heroImage: 'https://cdn.cloudflare.steamstatic.com/heroes/icons/antimage.png?',
        heroKey: 'npc_dota_hero_antimage',
        heroName: 'Anti-Mage',
        losses: 2,
        matches: 3,
        winRate: 33,
        wins: 1,
      },
    ])
  })

  it('round-trips stable pagination cursors and rejects malformed input', () => {
    const cursor = {
      createdAt: '2026-08-24T23:37:58.312Z',
      id: 'f535cf8e-0114-4ff5-a63f-ef5e1f93db6a',
    }

    expect(decodeMatchHistoryCursor(encodeMatchHistoryCursor(cursor))).toEqual(cursor)
    expect(decodeMatchHistoryCursor('not-a-cursor')).toBeNull()
    expect(
      decodeMatchHistoryCursor(
        Buffer.from(JSON.stringify({ createdAt: 'nope', id: '' })).toString('base64url'),
      ),
    ).toBeNull()
  })

  it('normalizes optional KDA values and describes the queue', () => {
    expect(readKda({ assists: 15, deaths: 2, kills: 10 })).toEqual({
      assists: 15,
      deaths: 2,
      kills: 10,
    })
    expect(readKda({ assists: null, deaths: null, kills: null })).toBeNull()
    expect(readKda('bad data')).toBeNull()

    expect(formatQueueLabel({ gameMode: 22, isParty: false, lobbyType: 7 })).toBe('Ranked')
    expect(formatQueueLabel({ gameMode: 23, isParty: true, lobbyType: 7 })).toBe('Turbo · Party')
    expect(formatQueueLabel({ gameMode: 22, isParty: true, lobbyType: 0 })).toBe('Unranked · Party')
    expect(formatQueueLabel({ gameMode: null, isParty: false, lobbyType: null })).toBe(
      'Queue not recorded',
    )
    expect(formatStreamerScore({ direScore: 34, myTeam: 'dire', radiantScore: 48 })).toBe('34–48')
    expect(formatStreamerScore({ direScore: 31, myTeam: 'radiant', radiantScore: 42 })).toBe(
      '42–31',
    )
    expect(formatStreamerScore({ direScore: null, myTeam: 'radiant', radiantScore: 42 })).toBeNull()
  })
})
