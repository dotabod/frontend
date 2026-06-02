import { ArrowUpRight } from 'lucide-react'
import Link from 'next/link'
import { type CosmeticItem, formatSlot, hexA, initials, marketUrl, rarityOf } from './cosmetics'

export function ItemTile({ item, featured = false }: { item: CosmeticItem; featured?: boolean }) {
  const href = marketUrl(item)
  const r = rarityOf(item)
  const accent = r?.color

  const inner = (
    <div
      className={`group/tile relative flex h-full flex-col overflow-hidden rounded-xl border bg-gray-900/80 transition-transform duration-200 ease-out hover:-translate-y-0.5 ${
        featured ? 'p-4' : 'p-3'
      }`}
      style={{ borderColor: accent ? hexA(accent, featured ? 0.55 : 0.3) : 'rgb(55 65 81)' }}
    >
      {/* Rarity glow + crisp inner ring. Always on for featured tiles, on hover for the rest. */}
      {accent && (
        <span
          aria-hidden
          className={`pointer-events-none absolute inset-0 rounded-xl transition-opacity duration-200 ${
            featured ? 'opacity-100' : 'opacity-0 group-hover/tile:opacity-100'
          }`}
          style={{
            boxShadow: `inset 0 0 0 1px ${hexA(accent, 0.9)}, 0 0 28px ${hexA(accent, 0.18)}`,
          }}
        />
      )}
      <div
        className={`mb-3 flex items-center justify-center overflow-hidden rounded-lg bg-black/40 ${
          featured ? 'aspect-[16/10]' : 'aspect-[4/3]'
        }`}
        style={
          !item.icon && accent
            ? {
                background: `radial-gradient(circle at 50% 42%, ${hexA(accent, 0.14)}, rgba(0,0,0,0.4) 70%)`,
              }
            : undefined
        }
      >
        {item.icon ? (
          <img
            src={item.icon}
            alt={item.name}
            loading='lazy'
            className='max-h-full max-w-full object-contain'
          />
        ) : (
          <span
            aria-hidden
            className={`select-none font-bold tracking-wide ${featured ? 'text-4xl' : 'text-2xl'}`}
            style={{ color: accent ? hexA(accent, 0.85) : 'rgb(107 114 128)' }}
          >
            {initials(item.name)}
          </span>
        )}
      </div>

      <div className='flex items-start justify-between gap-2'>
        <div className='min-w-0'>
          <p
            className={`line-clamp-2 font-medium text-white ${featured ? 'text-base' : 'text-sm'}`}
          >
            {item.name}
          </p>
          <p className='mt-0.5 text-xs text-gray-500'>{formatSlot(item.slot)}</p>
        </div>
        {href && (
          <ArrowUpRight
            size={16}
            className='mt-0.5 flex-shrink-0 text-gray-600 transition-colors group-hover/tile:text-purple-300'
          />
        )}
      </div>

      {r && (
        <span
          className='mt-3 text-[11px] font-semibold uppercase tracking-wider'
          style={{ color: r.color }}
        >
          {r.label}
        </span>
      )}
    </div>
  )

  if (!href) return inner

  return (
    <Link
      href={href}
      target='_blank'
      rel='noopener noreferrer'
      className='block h-full rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400'
    >
      {inner}
    </Link>
  )
}
