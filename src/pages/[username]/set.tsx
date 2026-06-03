import { ArrowUpRight, Sparkles } from 'lucide-react'
import type { GetServerSideProps } from 'next'
import Head from 'next/head'
import Link from 'next/link'
import { Container } from '@/components/Container'
import {
  bestRarity,
  type CosmeticItem,
  hexA,
  type HeroCardData,
  HeroCard,
  RARITY_META,
  RarityChip,
  rarityRank,
  STEAM_CDN,
} from '@/components/CosmeticSet'
import HomepageShell from '@/components/Homepage/HomepageShell'
import prisma from '@/lib/db'

type Card = HeroCardData & { updatedIso: string }

interface SetPageProps {
  username: string
  displayName: string
  image: string | null
  rosterSize: number
  cards: Card[]
  // Whole-collection tally of the trophy rarities (legendary and up), rarest first.
  tally: Array<{ rarity: string; count: number }>
}

function CompletionMeter({
  collected,
  roster,
  accent,
}: {
  collected: number
  roster: number
  accent: string
}) {
  const pct = roster > 0 ? Math.min(100, Math.round((collected / roster) * 100)) : 0
  return (
    <div className='max-w-md'>
      <div className='flex items-baseline justify-between text-sm'>
        <span className='font-medium text-gray-200'>
          {collected} of {roster} heroes collected
        </span>
        <span className='text-gray-500'>{pct}%</span>
      </div>
      <div className='mt-2 h-1.5 w-full overflow-hidden rounded-full bg-gray-800'>
        <div
          className='h-full rounded-full transition-[width] duration-500 ease-out'
          style={{
            width: `${pct}%`,
            background: `linear-gradient(90deg, ${hexA(accent, 0.5)}, ${accent})`,
          }}
        />
      </div>
    </div>
  )
}

// Faint placeholders for heroes not yet played: empty slots in the binder, there to
// be filled. Kept to a teaser count so a sparse collection still feels aspirational.
function GhostSlot() {
  return (
    <div className='flex aspect-[5/7] items-center justify-center rounded-2xl border border-dashed border-gray-800 bg-gray-900/40'>
      <Sparkles size={20} className='text-gray-700' aria-hidden />
    </div>
  )
}

function EmptyBinder({ displayName }: { displayName: string }) {
  return (
    <div className='py-6 sm:py-12'>
      <div className='mx-auto max-w-xl text-center'>
        <h2 className='text-xl font-semibold text-white sm:text-2xl'>This binder is empty</h2>
        <p className='mx-auto mt-3 max-w-md text-sm leading-6 text-gray-400'>
          When {displayName} picks a hero on stream, its equipped set gets pulled into the
          collection. Anyone in chat can also type{' '}
          <span className='rounded bg-gray-800 px-1.5 py-0.5 font-semibold text-purple-300'>
            !set
          </span>{' '}
          to capture the current hero.
        </p>
      </div>
      <div className='mx-auto mt-10 grid max-w-md grid-cols-2 gap-4 opacity-40 sm:grid-cols-4'>
        {Array.from({ length: 4 }).map((_, i) => (
          <GhostSlot key={i} />
        ))}
      </div>
    </div>
  )
}

const SetPage = ({ username, displayName, image, rosterSize, cards, tally }: SetPageProps) => {
  const collected = cards.length
  const hasCards = collected > 0
  const featured = cards.find((c) => c.justPlayed) ?? cards[0]
  const rest = featured ? cards.filter((c) => c.heroId !== featured.heroId) : cards
  const remaining = Math.max(0, rosterSize - collected)
  const ghostCount = Math.min(6, remaining)

  const topAccent =
    (featured?.bestRarity && RARITY_META[featured.bestRarity]?.color) ||
    (cards[0]?.bestRarity && RARITY_META[cards[0].bestRarity]?.color) ||
    '#9146ff'

  const pageTitle = `${displayName}'s hero cosmetic collection | Dotabod`
  const pageDescription = hasCards
    ? `${collected} heroes collected, each with the cosmetic set ${displayName} equipped on stream.`
    : `${displayName}'s hero cosmetic collection on Dotabod.`

  return (
    <>
      <Head>
        <title>{pageTitle}</title>
        <meta name='description' content={pageDescription} />
        <meta property='og:title' content={pageTitle} />
        <meta property='og:description' content={pageDescription} />
        <link rel='canonical' href={`https://dotabod.com/${username}/set`} />
        <meta name='robots' content='noindex, follow' />
      </Head>
      <HomepageShell
        dontUseTitle
        ogImage={{ subtitle: pageDescription, title: `${displayName}'s collection` }}
      >
        <header className='relative overflow-hidden border-b border-gray-800 bg-gray-950'>
          <div
            aria-hidden
            className='absolute inset-0'
            style={{
              background: `radial-gradient(70% 110% at 80% 0%, ${hexA(topAccent, 0.18)}, transparent 60%)`,
            }}
          />
          <Container className='relative py-10 sm:py-14'>
            <div className='flex items-center gap-2.5 text-sm text-gray-400'>
              <img
                onError={(e) => {
                  e.currentTarget.src = '/images/hero/default.png'
                }}
                src={image || '/images/hero/default.png'}
                alt={displayName}
                width={28}
                height={28}
                className='h-7 w-7 rounded-full ring-1 ring-gray-700'
              />
              <Link href={`/${username}`} className='font-medium text-gray-200 hover:text-white'>
                {displayName}
              </Link>
              <span className='text-gray-700'>·</span>
              <Link
                href={`https://twitch.tv/${username}`}
                target='_blank'
                rel='noopener noreferrer'
                className='inline-flex items-center gap-0.5 text-purple-300 hover:text-purple-200'
              >
                Watch on Twitch
                <ArrowUpRight size={14} />
              </Link>
            </div>

            <h1 className='mt-4 text-3xl font-bold tracking-tight text-white sm:text-5xl'>
              Cosmetic collection
            </h1>

            {hasCards && (
              <>
                <div className='mt-6'>
                  <CompletionMeter collected={collected} roster={rosterSize} accent={topAccent} />
                </div>
                {tally.length > 0 && (
                  <div className='mt-5 flex flex-wrap items-center gap-2'>
                    {tally.map((c) => (
                      <RarityChip key={c.rarity} rarity={c.rarity} count={c.count} />
                    ))}
                  </div>
                )}
              </>
            )}
          </Container>
        </header>

        <Container className='py-10'>
          {!hasCards ? (
            <EmptyBinder displayName={displayName} />
          ) : (
            <>
              {featured && (
                <section className='mb-12'>
                  <h2 className='mb-4 text-xs font-semibold uppercase tracking-widest text-gray-500'>
                    {featured.justPlayed ? 'Newest pull' : 'Latest hero'}
                  </h2>
                  <div className='grid grid-cols-1 gap-6 sm:grid-cols-[minmax(0,260px)_1fr] sm:items-end'>
                    <HeroCard username={username} card={featured} size='lg' />
                    <div className='pb-1'>
                      <p className='text-2xl font-bold text-white'>{featured.heroName}</p>
                      <p className='mt-1 text-sm text-gray-400'>
                        {featured.itemCount} equipped{' '}
                        {featured.itemCount === 1 ? 'cosmetic' : 'cosmetics'}
                        {featured.updatedLabel && (
                          <>
                            {' · captured '}
                            <time dateTime={featured.updatedIso}>{featured.updatedLabel}</time>
                          </>
                        )}
                      </p>
                      <Link
                        href={`/${username}/set/${featured.heroId}`}
                        className='mt-4 inline-flex items-center gap-1 text-sm font-medium text-purple-300 hover:text-purple-200'
                      >
                        View the full set
                        <ArrowUpRight size={14} />
                      </Link>
                    </div>
                  </div>
                </section>
              )}

              {rest.length > 0 && (
                <section>
                  <h2 className='mb-4 text-xs font-semibold uppercase tracking-widest text-gray-500'>
                    The collection
                  </h2>
                  <div className='grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5'>
                    {rest.map((card) => (
                      <HeroCard key={card.heroId} username={username} card={card} />
                    ))}
                    {ghostCount > 0 &&
                      Array.from({ length: ghostCount }).map((_, i) => <GhostSlot key={`g${i}`} />)}
                  </div>
                </section>
              )}

              {remaining > 0 && (
                <p className='mt-8 text-center text-xs text-gray-600'>
                  {remaining} more {remaining === 1 ? 'hero' : 'heroes'} left to discover.
                </p>
              )}
            </>
          )}
        </Container>
      </HomepageShell>
    </>
  )
}

export const getServerSideProps: GetServerSideProps<SetPageProps> = async ({ params }) => {
  const username = (params?.username as string)?.toLowerCase()
  if (!username) return { notFound: true }

  const user = await prisma.user.findFirst({
    where: { name: username },
    select: {
      name: true,
      displayName: true,
      image: true,
      cosmeticLoadouts: {
        select: { heroId: true, heroName: true, items: true, updatedAt: true },
      },
    },
  })

  if (!user) return { notFound: true }

  // Loaded here (not at module scope) so the hero map stays out of the client bundle.
  const heroes = (await import('dotaconstants/build/heroes.json')).default as Record<
    string,
    { img?: string }
  >
  const rosterSize = Object.keys(heroes).length

  const fmt = new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeZone: 'UTC',
  })

  const loadouts = user.cosmeticLoadouts
  const newestId = loadouts.reduce<{ id: number; at: number }>(
    (acc, l) =>
      l.updatedAt.getTime() > acc.at ? { id: l.heroId, at: l.updatedAt.getTime() } : acc,
    { id: -1, at: -1 },
  ).id

  const cards: Card[] = loadouts
    .map((l) => {
      const items = Array.isArray(l.items) ? (l.items as unknown as CosmeticItem[]) : []
      const heroImg = heroes[String(l.heroId)]?.img
      return {
        heroId: l.heroId,
        heroName: l.heroName,
        heroImg: heroImg ? `${STEAM_CDN}${heroImg}` : null,
        itemCount: items.length,
        bestRarity: bestRarity(items),
        updatedIso: l.updatedAt.toISOString(),
        updatedLabel: fmt.format(l.updatedAt),
        justPlayed: l.heroId === newestId,
      }
    })
    // Binder opens on the holos: rarity desc, then most recent.
    .sort((a, b) => {
      const byRarity =
        (b.bestRarity ? (RARITY_META[b.bestRarity]?.rank ?? -1) : -1) -
        (a.bestRarity ? (RARITY_META[a.bestRarity]?.rank ?? -1) : -1)
      if (byRarity) return byRarity
      return b.updatedIso.localeCompare(a.updatedIso)
    })

  // Trophy tally: count individual items of legendary rarity and up across every hero.
  const tallyCounts = new Map<string, number>()
  for (const l of loadouts)
    for (const item of Array.isArray(l.items) ? (l.items as unknown as CosmeticItem[]) : [])
      if (rarityRank(item) >= 4)
        tallyCounts.set(item.rarity as string, (tallyCounts.get(item.rarity as string) ?? 0) + 1)
  const tally = [...tallyCounts.entries()]
    .map(([rarity, count]) => ({ rarity, count }))
    .sort((a, b) => (RARITY_META[b.rarity]?.rank ?? 0) - (RARITY_META[a.rarity]?.rank ?? 0))
    .slice(0, 4)

  return {
    props: {
      username: user.name,
      displayName: user.displayName || user.name,
      image: user.image,
      rosterSize,
      cards,
      tally,
    },
  }
}

export default SetPage
