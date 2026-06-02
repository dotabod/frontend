import Link from 'next/link'
import { type PointerEvent, useEffect, useRef, useState } from 'react'
import { hexA, RARITY_META } from './cosmetics'

export interface HeroCardData {
  heroId: number
  heroName: string
  heroImg: string | null
  itemCount: number
  bestRarity?: string
  updatedLabel?: string
  justPlayed?: boolean
}

type Size = 'sm' | 'md' | 'lg'

const SIZE: Record<Size, { name: string; meta: string }> = {
  sm: { name: 'text-sm', meta: 'text-[10px]' },
  md: { name: 'text-base', meta: 'text-[11px]' },
  lg: { name: 'text-xl sm:text-2xl', meta: 'text-xs' },
}

// Treatment tiers (the Pokémon holo-vs-common instinct): chase cards earn the most
// ornament, commons stay quiet. Variance carries information (who owns the rares).
const tier = (rank: number) => (rank >= 5 ? 'chase' : rank >= 2 ? 'foil' : 'flat')

function useReducedMotion() {
  const [reduced, setReduced] = useState(true)
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setReduced(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])
  return reduced
}

// A hero in the collection, rendered as a trading card: 5:7 portrait, full-bleed
// splash art, a bottom scrim with name + best rarity. On pointer-move it tilts and a
// sheen follows the cursor — the holographic-card feel — unless reduced motion is set.
export function HeroCard({
  username,
  card,
  size = 'md',
  className = '',
}: {
  username: string
  card: HeroCardData
  size?: Size
  className?: string
}) {
  const planeRef = useRef<HTMLDivElement>(null)
  const reduced = useReducedMotion()
  const interactive = !reduced

  const meta = card.bestRarity ? RARITY_META[card.bestRarity] : undefined
  const accent = meta?.color ?? '#9146ff'
  const rank = meta?.rank ?? -1
  const t = tier(rank)
  const s = SIZE[size]

  const onMove = (e: PointerEvent<HTMLAnchorElement>) => {
    const el = planeRef.current
    if (!el || !interactive) return
    const r = e.currentTarget.getBoundingClientRect()
    const px = (e.clientX - r.left) / r.width
    const py = (e.clientY - r.top) / r.height
    el.style.setProperty('--rx', `${(0.5 - py) * 10}deg`)
    el.style.setProperty('--ry', `${(px - 0.5) * 10}deg`)
    el.style.setProperty('--mx', `${px * 100}%`)
    el.style.setProperty('--my', `${py * 100}%`)
    el.style.setProperty('--sheen', '1')
  }

  const reset = () => {
    const el = planeRef.current
    if (!el) return
    el.style.setProperty('--rx', '0deg')
    el.style.setProperty('--ry', '0deg')
    el.style.setProperty('--sheen', '0')
  }

  return (
    <Link
      href={`/${username}/set/${card.heroId}`}
      onPointerMove={onMove}
      onPointerLeave={reset}
      className={`group/card block rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 ${className}`}
      style={{ perspective: interactive ? '900px' : undefined }}
      aria-label={`${card.heroName} — ${card.itemCount} cosmetics${meta ? `, up to ${meta.label}` : ''}`}
    >
      <div
        ref={planeRef}
        className='relative aspect-[5/7] overflow-hidden rounded-2xl border bg-gray-900 transition-transform duration-200 ease-out will-change-transform group-hover/card:-translate-y-0.5'
        style={{
          borderColor: t === 'flat' ? hexA(accent, 0.3) : hexA(accent, 0.55),
          transform: interactive ? 'rotateX(var(--rx,0deg)) rotateY(var(--ry,0deg))' : undefined,
          boxShadow:
            t === 'chase'
              ? `0 0 0 1px ${hexA(accent, 0.8)}, 0 12px 40px ${hexA(accent, 0.28)}`
              : t === 'foil'
                ? `0 8px 30px ${hexA(accent, 0.16)}`
                : '0 6px 20px rgba(0,0,0,0.35)',
        }}
      >
        {/* Hero splash as the card face. */}
        {card.heroImg ? (
          <img
            src={card.heroImg}
            alt={card.heroName}
            loading='lazy'
            className='absolute inset-0 h-full w-full object-cover object-center'
          />
        ) : (
          <div
            aria-hidden
            className='absolute inset-0'
            style={{
              background: `radial-gradient(circle at 50% 35%, ${hexA(accent, 0.22)}, #0b0d12 70%)`,
            }}
          />
        )}

        {/* Rarity wash over the art so the card reads as its quality at a glance. */}
        <div
          aria-hidden
          className='absolute inset-0'
          style={{
            background: `linear-gradient(180deg, ${hexA(accent, t === 'flat' ? 0.04 : 0.1)} 0%, transparent 35%, rgba(8,10,14,0.55) 72%, rgba(8,10,14,0.96) 100%)`,
          }}
        />

        {/* Cursor-tracked sheen — the holographic sweep. Paint-only; off when reduced. */}
        {interactive && (
          <div
            aria-hidden
            className='pointer-events-none absolute inset-0 mix-blend-screen transition-opacity duration-200'
            style={{
              opacity: 'var(--sheen,0)' as unknown as number,
              background: `radial-gradient(40% 30% at var(--mx,50%) var(--my,0%), ${hexA(accent, 0.5)}, transparent 70%)`,
            }}
          />
        )}

        {/* Chase-only corner flourishes. */}
        {t === 'chase' && (
          <>
            <Corner pos='left-2 top-2' accent={accent} />
            <Corner pos='right-2 top-2 rotate-90' accent={accent} />
            <Corner pos='bottom-2 left-2 -rotate-90' accent={accent} />
            <Corner pos='bottom-2 right-2 rotate-180' accent={accent} />
          </>
        )}

        {card.justPlayed && (
          <span className='absolute left-2 top-2 rounded-full bg-black/55 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-purple-200 ring-1 ring-purple-400/40 backdrop-blur-sm'>
            Just played
          </span>
        )}

        {/* Name / rarity / count strip. */}
        <div className='absolute inset-x-0 bottom-0 p-3'>
          <p className={`line-clamp-2 font-bold leading-tight text-white ${s.name}`}>
            {card.heroName}
          </p>
          <div
            className={`mt-1 flex items-center gap-1.5 font-semibold uppercase tracking-wider ${s.meta}`}
          >
            {meta && <span style={{ color: meta.color }}>{meta.label}</span>}
            {meta && <span className='text-gray-600'>·</span>}
            <span className='text-gray-400'>{card.itemCount} items</span>
          </div>
        </div>
      </div>
    </Link>
  )
}

function Corner({ pos, accent }: { pos: string; accent: string }) {
  return (
    <span
      aria-hidden
      className={`absolute h-4 w-4 border-l-2 border-t-2 ${pos}`}
      style={{ borderColor: hexA(accent, 0.85) }}
    />
  )
}
