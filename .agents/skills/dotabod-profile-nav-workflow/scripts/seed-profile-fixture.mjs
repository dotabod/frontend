import { PrismaClient } from '@prisma/client'
import heroes from 'dotaconstants/build/heroes.json' with { type: 'json' }

function option(name, fallback) {
  const index = process.argv.indexOf(`--${name}`)
  return index === -1 ? fallback : process.argv[index + 1]
}

function requireLocalDatabase() {
  const raw = process.env.DATABASE_URL
  if (!raw) throw new Error('DATABASE_URL is required')

  const database = new URL(raw)
  if (!['127.0.0.1', 'localhost'].includes(database.hostname)) {
    throw new Error(`Refusing to seed non-local database host: ${database.hostname}`)
  }
}

async function pageProps(url) {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`Failed to fetch ${url}: ${response.status}`)

  const html = await response.text()
  const match = html.match(
    /<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/,
  )
  if (!match) throw new Error(`Missing __NEXT_DATA__ on ${url}`)
  return JSON.parse(match[1]).props.pageProps
}

function genericItems(card) {
  return Array.from({ length: card.itemCount }, (_, index) => ({
    defindex: card.heroId * 1000 + index,
    image_inventory: '',
    market_hash_name: `${card.heroName} cosmetic ${index + 1}`,
    name: `${card.heroName} cosmetic ${index + 1}`,
    rarity: index === 0 ? card.bestRarity : 'common',
  }))
}

requireLocalDatabase()

const username = option('username', 'maxid1337')
const heroId = Number(option('hero-id', '2'))
const sourceOrigin = option('source-origin', 'https://dotabod.com').replace(/\/$/, '')
if (!Number.isInteger(heroId)) throw new Error('--hero-id must be an integer')

const [collection, detail] = await Promise.all([
  pageProps(`${sourceOrigin}/${username}/set`),
  pageProps(`${sourceOrigin}/${username}/set/${heroId}`),
])

if (!Array.isArray(collection.cards) || collection.cards.length === 0) {
  throw new Error('Public collection fixture contains no cards')
}
if (!Array.isArray(detail.items)) throw new Error('Public hero detail fixture contains no items')

const prisma = new PrismaClient()
try {
  const existing = await prisma.user.findFirst({ where: { name: username }, select: { id: true } })
  if (existing) await prisma.user.delete({ where: { id: existing.id } })

  const user = await prisma.user.create({
    data: {
      displayName: collection.displayName,
      image: collection.image,
      name: collection.username,
    },
  })

  for (const card of collection.cards) {
    await prisma.cosmeticLoadout.create({
      data: {
        heroId: card.heroId,
        heroName: card.heroName,
        items: card.heroId === detail.heroId ? detail.items : genericItems(card),
        matchId: `profile-nav-${card.heroId}`,
        updatedAt: new Date(card.updatedIso),
        userId: user.id,
      },
    })
  }

  const heroKeys = Object.fromEntries(Object.values(heroes).map((hero) => [hero.id, hero.name]))
  const matchCards = Array.from(
    { length: 25 },
    (_, index) => collection.cards[index % collection.cards.length],
  )
  const now = Date.now()

  for (const [index, card] of matchCards.entries()) {
    const won = index < 6
    await prisma.matches.create({
      data: {
        created_at: new Date(now - index * 24 * 60 * 60 * 1000),
        dire_score: won ? 33 : 41,
        game_mode: index % 3 === 0 ? 23 : 22,
        hero_name: heroKeys[card.heroId] ?? 'npc_dota_hero_axe',
        is_doubledown: index === 0,
        is_party: index % 2 === 0,
        kda: { assists: 12 + index, deaths: 3 + (index % 4), kills: 8 + index },
        lobby_type: index % 3 === 0 ? 0 : 7,
        matchId: String(8_964_010_929n - BigInt(index)),
        myTeam: 'radiant',
        radiant_score: won ? 64 : 29,
        userId: user.id,
        won,
      },
    })
  }

  console.log(
    JSON.stringify({
      heroItems: detail.items.length,
      loadouts: collection.cards.length,
      matches: matchCards.length,
      username: user.name,
    }),
  )
} finally {
  await prisma.$disconnect()
}
