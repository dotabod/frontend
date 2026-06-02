import { hexA, RARITY_META } from './cosmetics'

export function RarityChip({ rarity, count }: { rarity: string; count: number }) {
  const r = RARITY_META[rarity]
  if (!r) return null
  return (
    <span
      className='inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium'
      style={{
        borderColor: hexA(r.color, 0.4),
        backgroundColor: hexA(r.color, 0.08),
        color: r.color,
      }}
    >
      <span className='h-1.5 w-1.5 rounded-full' style={{ backgroundColor: r.color }} />
      {count > 1 ? `${count} ${r.label}` : r.label}
    </span>
  )
}
