// Shared cosmetic-set primitives: types, the Steam rarity palette, and the pure
// helpers used by the loadout detail page, the collection grid, and the hero cards.

export const STEAM_CDN = 'https://cdn.cloudflare.steamstatic.com'

export interface CosmeticItem {
  defindex: number
  name: string
  slot: string
  rarity?: string
  marketHashName?: string
  marketable: boolean
  icon?: string
}

// In-game loadout order; used only as a tiebreak once items are ranked by rarity.
export const SLOT_ORDER = [
  'weapon',
  'head',
  'shoulder',
  'arms',
  'back',
  'belt',
  'legs',
  'neck',
  'tail',
  'misc',
  'mount',
  'summon',
  'taunt',
  'ability',
  'voice',
]

// Canonical Steam / Dota item-quality colors, in ascending prestige. These are the
// exact hues players already see in their inventory, so they read as meaningful data,
// not decoration. Kept as hex on purpose: fidelity to the external system matters more
// than re-deriving them in OKLCH.
export const RARITY_META: Record<string, { rank: number; color: string; label: string }> = {
  common: { rank: 0, color: '#b0c3d9', label: 'Common' },
  uncommon: { rank: 1, color: '#5e98d9', label: 'Uncommon' },
  rare: { rank: 2, color: '#4b69ff', label: 'Rare' },
  mythical: { rank: 3, color: '#8847ff', label: 'Mythical' },
  legendary: { rank: 4, color: '#d32ce6', label: 'Legendary' },
  immortal: { rank: 5, color: '#e4ae39', label: 'Immortal' },
  arcana: { rank: 6, color: '#ade55c', label: 'Arcana' },
  ancient: { rank: 7, color: '#eb4b4b', label: 'Ancient' },
}

// Slots arrive as raw tokens like "body_head"; show them as "Body Head".
export const formatSlot = (slot: string) =>
  slot.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())

// Fallback monogram for items that have no captured icon (most do not).
export const initials = (name: string) =>
  name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0] ?? '')
    .join('')
    .toUpperCase()

export const hexA = (hex: string, alpha: number) =>
  hex +
  Math.round(alpha * 255)
    .toString(16)
    .padStart(2, '0')

export const rarityOf = (item: CosmeticItem) => (item.rarity ? RARITY_META[item.rarity] : undefined)
export const rarityRank = (item: CosmeticItem) => rarityOf(item)?.rank ?? -1

export function marketUrl(item: CosmeticItem): string | null {
  if (!item.marketable || !item.marketHashName) return null
  return `https://steamcommunity.com/market/listings/570/${encodeURIComponent(item.marketHashName)}`
}

export function sortByRarity(items: CosmeticItem[]): CosmeticItem[] {
  return [...items].sort((a, b) => {
    const byRarity = rarityRank(b) - rarityRank(a)
    if (byRarity) return byRarity
    const ai = SLOT_ORDER.indexOf(a.slot)
    const bi = SLOT_ORDER.indexOf(b.slot)
    const bySlot = (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi)
    if (bySlot) return bySlot
    return a.name.localeCompare(b.name)
  })
}

// Highest-rank rarity present in a loadout. Drives a hero card's accent and which
// treatment tier (flat / foil / chase) it gets.
export function bestRarity(items: CosmeticItem[]): string | undefined {
  let best: string | undefined
  let bestRank = -1
  for (const i of items) {
    const rank = rarityRank(i)
    if (rank > bestRank) {
      bestRank = rank
      best = i.rarity
    }
  }
  return best
}

// rarity -> count across a loadout, rarest first. Reused for the collection header
// tally and the per-card chip summary.
export function rarityTally(items: CosmeticItem[]): Array<[string, number]> {
  const counts = new Map<string, number>()
  for (const i of items) if (i.rarity) counts.set(i.rarity, (counts.get(i.rarity) ?? 0) + 1)
  return [...counts.entries()].sort(
    (a, b) => (RARITY_META[b[0]]?.rank ?? -1) - (RARITY_META[a[0]]?.rank ?? -1),
  )
}
