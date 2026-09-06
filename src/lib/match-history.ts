const STEAM_CDN = 'https://cdn.cloudflare.steamstatic.com'

export interface MatchResultGroup {
  count: number
  heroName: string | null
  won: boolean | null
}

export interface HeroMetadata {
  icon?: string
  localized_name?: string
  name?: string
}

export interface HeroPerformance {
  heroImage: string | null
  heroKey: string
  heroName: string
  losses: number
  matches: number
  winRate: number
  wins: number
}

export interface MatchHistoryCursor {
  createdAt: string
  id: string
}

export interface Kda {
  assists: number
  deaths: number
  kills: number
}

export interface MatchHistoryRow {
  createdAt: string
  dateLabel: string
  heroImage: string | null
  heroName: string
  isDoubleDown: boolean
  kda: Kda | null
  matchId: string
  queueLabel: string
  score: string | null
  won: boolean
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu

const percentage = function percentage(wins: number, matches: number): number {
  return matches > 0 ? Math.round((wins / matches) * 100) : 0
}

const fallbackHeroName = function fallbackHeroName(heroKey: string): string {
  return heroKey
    .replace(/^npc_dota_hero_/u, '')
    .split('_')
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(' ')
}

const heroMetadataByKey = function heroMetadataByKey(
  heroes: Record<string, HeroMetadata>,
): Map<string, HeroMetadata> {
  const byKey = new Map<string, HeroMetadata>()
  for (const hero of Object.values(heroes)) {
    if (hero.name) byKey.set(hero.name, hero)
  }
  return byKey
}

export const buildMatchHistorySummary = function buildMatchHistorySummary(
  groups: MatchResultGroup[],
): {
  heroesPlayed: number
  losses: number
  matches: number
  winRate: number
  wins: number
} {
  let wins = 0
  let losses = 0
  const heroes = new Set<string>()

  for (const group of groups) {
    if (group.won === true) {
      wins += group.count
    }
    if (group.won === false) {
      losses += group.count
    }
    if (group.heroName) {
      heroes.add(group.heroName)
    }
  }

  const matches = wins + losses
  return {
    heroesPlayed: heroes.size,
    losses,
    matches,
    winRate: percentage(wins, matches),
    wins,
  }
}

export const buildHeroPerformance = function buildHeroPerformance(
  groups: MatchResultGroup[],
  heroes: Record<string, HeroMetadata>,
): HeroPerformance[] {
  const metadata = heroMetadataByKey(heroes)
  const combined = new Map<string, { losses: number; wins: number }>()

  for (const group of groups) {
    if (!group.heroName || group.won === null) {
      continue
    }
    const current = combined.get(group.heroName) ?? { losses: 0, wins: 0 }
    if (group.won) {
      current.wins += group.count
    } else {
      current.losses += group.count
    }
    combined.set(group.heroName, current)
  }

  return [...combined.entries()]
    .map(([heroKey, result]) => {
      const hero = metadata.get(heroKey)
      const matches = result.wins + result.losses
      return {
        heroImage: hero?.icon ? `${STEAM_CDN}${hero.icon}` : null,
        heroKey,
        heroName: hero?.localized_name ?? fallbackHeroName(heroKey),
        losses: result.losses,
        matches,
        winRate: percentage(result.wins, matches),
        wins: result.wins,
      }
    })
    .sort(
      (a, b) =>
        b.matches - a.matches || b.winRate - a.winRate || a.heroName.localeCompare(b.heroName),
    )
}

export const encodeMatchHistoryCursor = function encodeMatchHistoryCursor(
  cursor: MatchHistoryCursor,
): string {
  return Buffer.from(JSON.stringify(cursor)).toString('base64url')
}

export const decodeMatchHistoryCursor = function decodeMatchHistoryCursor(
  value: string | string[] | undefined,
): MatchHistoryCursor | null {
  if (typeof value !== 'string' || !value) {
    return null
  }

  try {
    const decoded = JSON.parse(
      Buffer.from(value, 'base64url').toString('utf-8'),
    ) as Partial<MatchHistoryCursor>
    if (
      typeof decoded.createdAt !== 'string' ||
      Number.isNaN(Date.parse(decoded.createdAt)) ||
      typeof decoded.id !== 'string' ||
      !UUID_PATTERN.test(decoded.id)
    ) {
      return null
    }
    return { createdAt: decoded.createdAt, id: decoded.id }
  } catch {
    return null
  }
}

export const readKda = function readKda(value: unknown): Kda | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null
  }
  const candidate = value as Partial<Kda>
  if (
    typeof candidate.kills !== 'number' ||
    typeof candidate.deaths !== 'number' ||
    typeof candidate.assists !== 'number' ||
    !Number.isFinite(candidate.kills) ||
    !Number.isFinite(candidate.deaths) ||
    !Number.isFinite(candidate.assists)
  ) {
    return null
  }
  return {
    assists: candidate.assists,
    deaths: candidate.deaths,
    kills: candidate.kills,
  }
}

export const formatQueueLabel = function formatQueueLabel({
  gameMode,
  isParty,
  lobbyType,
}: {
  gameMode: number | null
  isParty: boolean
  lobbyType: number | null
}): string {
  const queue =
    gameMode === 23
      ? 'Turbo'
      : lobbyType === 7
        ? 'Ranked'
        : lobbyType === 0
          ? 'Unranked'
          : 'Queue not recorded'
  return isParty ? `${queue} · Party` : queue
}

export const formatStreamerScore = function formatStreamerScore({
  direScore,
  myTeam,
  radiantScore,
}: {
  direScore: number | null
  myTeam: string
  radiantScore: number | null
}): string | null {
  if (radiantScore === null || direScore === null) {
    return null
  }
  return myTeam === 'dire' ? `${direScore}–${radiantScore}` : `${radiantScore}–${direScore}`
}
