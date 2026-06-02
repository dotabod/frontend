import { ArrowLeft, ArrowRight, ArrowUpRight } from 'lucide-react'
import type { GetServerSideProps } from 'next'
import Head from 'next/head'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { useEffect } from 'react'
import { Container } from '@/components/Container'
import {
  type CosmeticItem,
  hexA,
  ItemTile,
  RARITY_META,
  RarityChip,
  rarityOf,
  rarityRank,
  sortByRarity,
  STEAM_CDN,
} from '@/components/CosmeticSet'
import HomepageShell from '@/components/Homepage/HomepageShell'
import prisma from '@/lib/db'

interface Sibling {
  heroId: number
  heroName: string
}

interface DetailPageProps {
  username: string
  displayName: string
  heroId: number
  heroImage: string | null
  heroName: string
  items: CosmeticItem[]
  updatedIso: string
  updatedLabel: string
  position: number
  total: number
  prev: Sibling | null
  next: Sibling | null
}

const DetailPage = ({
  username,
  displayName,
  heroId,
  heroImage,
  heroName,
  items,
  updatedIso,
  updatedLabel,
  position,
  total,
  prev,
  next,
}: DetailPageProps) => {
  const router = useRouter()

  // Flip through the binder with the arrow keys, ignoring typing contexts.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement)?.isContentEditable)
        return
      if (e.key === 'ArrowLeft' && prev) void router.push(`/${username}/set/${prev.heroId}`)
      if (e.key === 'ArrowRight' && next) void router.push(`/${username}/set/${next.heroId}`)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [router, username, prev, next])

  const sorted = sortByRarity(items)
  const notable = sorted.filter((i) => rarityRank(i) >= 2)
  const featured = items.length >= 6 && notable.length > 0 ? notable.slice(0, 3) : []
  const featuredKeys = new Set(featured.map((i) => i.defindex))

  const rarityCounts = new Map<string, number>()
  for (const i of items)
    if (i.rarity) rarityCounts.set(i.rarity, (rarityCounts.get(i.rarity) ?? 0) + 1)
  const summaryChips = [...rarityCounts.entries()]
    .map(([rarity, count]) => ({ rarity, count, meta: RARITY_META[rarity] }))
    .filter((x) => x.meta && x.meta.rank >= 3)
    .sort((a, b) => b.meta.rank - a.meta.rank)
    .slice(0, 4)

  const topAccent = (sorted[0] && rarityOf(sorted[0])?.color) || '#9146ff'

  const pageTitle = `${displayName}'s ${heroName} cosmetics | Dotabod`
  const pageDescription = `${heroName} loadout: ${items.length} equipped cosmetics, each linked to the Steam Community Market.`

  return (
    <>
      <Head>
        <title>{pageTitle}</title>
        <meta name='description' content={pageDescription} />
        <meta property='og:title' content={pageTitle} />
        <meta property='og:description' content={pageDescription} />
        <link rel='canonical' href={`https://dotabod.com/${username}/set/${heroId}`} />
        <meta name='robots' content='noindex, follow' />
      </Head>
      <HomepageShell
        dontUseTitle
        ogImage={{ subtitle: pageDescription, title: `${displayName}'s ${heroName}` }}
      >
        <header className='relative overflow-hidden border-b border-gray-800 bg-gray-950'>
          {heroImage && (
            <img
              aria-hidden
              src={heroImage}
              alt=''
              className='absolute inset-y-0 right-0 hidden h-full w-2/3 object-cover object-center opacity-40 sm:block'
            />
          )}
          <div
            aria-hidden
            className='absolute inset-0'
            style={{
              background: `radial-gradient(80% 120% at 78% 30%, ${hexA(topAccent, 0.22)}, transparent 60%)`,
            }}
          />
          <div
            aria-hidden
            className='absolute inset-0 bg-gradient-to-r from-gray-950 via-gray-950/85 to-transparent'
          />

          <Container className='relative py-10 sm:py-16'>
            <div className='flex flex-wrap items-center gap-2 text-sm text-gray-400'>
              <Link href={`/${username}`} className='font-medium text-gray-200 hover:text-white'>
                {displayName}
              </Link>
              <span className='text-gray-700'>/</span>
              <Link href={`/${username}/set`} className='text-gray-300 hover:text-white'>
                Collection
              </Link>
              <span className='text-gray-700'>/</span>
              <span className='text-gray-400'>{heroName}</span>
            </div>

            <h1 className='mt-4 text-3xl font-bold tracking-tight text-white sm:text-5xl'>
              {heroName}
            </h1>

            <div className='mt-4 flex flex-wrap items-center gap-x-3 gap-y-2'>
              <span className='text-sm text-gray-300'>
                {items.length} equipped {items.length === 1 ? 'cosmetic' : 'cosmetics'}
              </span>
              {summaryChips.length > 0 && (
                <>
                  <span className='text-gray-700'>·</span>
                  {summaryChips.map((c) => (
                    <RarityChip key={c.rarity} rarity={c.rarity} count={c.count} />
                  ))}
                </>
              )}
            </div>
          </Container>
        </header>

        {/* Binder navigation: flip to the adjacent hero in the collection. */}
        <div className='border-b border-gray-800 bg-gray-900/40'>
          <Container className='flex items-center justify-between gap-3 py-3 text-sm'>
            {prev ? (
              <Link
                href={`/${username}/set/${prev.heroId}`}
                className='inline-flex min-w-0 items-center gap-1.5 text-gray-300 hover:text-white'
              >
                <ArrowLeft size={16} className='flex-shrink-0' />
                <span className='truncate'>{prev.heroName}</span>
              </Link>
            ) : (
              <span />
            )}
            <Link
              href={`/${username}/set`}
              className='flex-shrink-0 text-xs font-medium uppercase tracking-wider text-gray-500 hover:text-gray-300'
            >
              {position} of {total}
            </Link>
            {next ? (
              <Link
                href={`/${username}/set/${next.heroId}`}
                className='inline-flex min-w-0 items-center justify-end gap-1.5 text-gray-300 hover:text-white'
              >
                <span className='truncate'>{next.heroName}</span>
                <ArrowRight size={16} className='flex-shrink-0' />
              </Link>
            ) : (
              <span />
            )}
          </Container>
        </div>

        <Container className='py-10'>
          {featured.length > 0 && (
            <section className='mb-12'>
              <h2 className='mb-4 text-xs font-semibold uppercase tracking-widest text-gray-500'>
                Spotlight
              </h2>
              <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3'>
                {featured.map((item) => (
                  <ItemTile key={item.defindex} item={item} featured />
                ))}
              </div>
            </section>
          )}

          <section>
            {featured.length > 0 && (
              <h2 className='mb-4 text-xs font-semibold uppercase tracking-widest text-gray-500'>
                Full loadout
              </h2>
            )}
            <div className='grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5'>
              {sorted.map((item) => (
                <ItemTile
                  key={item.defindex}
                  item={item}
                  featured={featured.length === 0 && featuredKeys.has(item.defindex)}
                />
              ))}
            </div>
          </section>

          <div className='mt-12 flex flex-col items-center gap-2 text-center text-xs text-gray-600'>
            <p>
              Marketable items link to the Steam Community Market. Captured{' '}
              <time dateTime={updatedIso}>{updatedLabel}</time>.
            </p>
            <Link
              href={`/${username}/set`}
              className='inline-flex items-center gap-1 text-purple-300 hover:text-purple-200'
            >
              Back to the collection
              <ArrowUpRight size={14} />
            </Link>
          </div>
        </Container>
      </HomepageShell>
    </>
  )
}

export const getServerSideProps: GetServerSideProps<DetailPageProps> = async ({ params }) => {
  const username = (params?.username as string)?.toLowerCase()
  const heroId = Number(params?.heroId)
  if (!username || !Number.isInteger(heroId)) return { notFound: true }

  const user = await prisma.user.findFirst({
    where: { name: username },
    select: {
      name: true,
      displayName: true,
      cosmeticLoadouts: {
        select: { heroId: true, heroName: true, items: true, updatedAt: true },
      },
    },
  })

  if (!user) return { notFound: true }

  const loadouts = user.cosmeticLoadouts
  // Same ordering as the collection grid so prev/next match what the user just saw.
  const ordered = [...loadouts].sort((a, b) => {
    const aBest = bestRank(a.items as unknown as CosmeticItem[])
    const bBest = bestRank(b.items as unknown as CosmeticItem[])
    if (bBest !== aBest) return bBest - aBest
    return b.updatedAt.getTime() - a.updatedAt.getTime()
  })

  const idx = ordered.findIndex((l) => l.heroId === heroId)
  if (idx === -1) return { notFound: true }

  const current = ordered[idx]
  const prevSib = ordered[idx - 1]
  const nextSib = ordered[idx + 1]

  const heroes = (await import('dotaconstants/build/heroes.json')).default as Record<
    string,
    { img?: string }
  >
  const heroImg = heroes[String(current.heroId)]?.img

  return {
    props: {
      username: user.name,
      displayName: user.displayName || user.name,
      heroId: current.heroId,
      heroImage: heroImg ? `${STEAM_CDN}${heroImg}` : null,
      heroName: current.heroName,
      items: current.items as unknown as CosmeticItem[],
      updatedIso: current.updatedAt.toISOString(),
      updatedLabel: new Intl.DateTimeFormat('en-US', {
        dateStyle: 'medium',
        timeStyle: 'short',
        timeZone: 'UTC',
      }).format(current.updatedAt),
      position: idx + 1,
      total: ordered.length,
      prev: prevSib ? { heroId: prevSib.heroId, heroName: prevSib.heroName } : null,
      next: nextSib ? { heroId: nextSib.heroId, heroName: nextSib.heroName } : null,
    },
  }
}

// Highest rarity rank in a loadout, computed server-side for the prev/next ordering.
function bestRank(items: CosmeticItem[]): number {
  let best = -1
  for (const i of items) best = Math.max(best, rarityRank(i))
  return best
}

export default DetailPage
