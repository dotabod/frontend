'use client'
import { Card } from '@/components/Card'

export function WinLossCard(wl: { win: number; lose: number; type: string }[]) {
  return (
    <div className="absolute bottom-0 right-[350px]">
      <Card>
        {wl.map(({ win, lose, type }) => (
          <div
            key={type}
            className="flex w-full flex-row items-baseline justify-end space-x-1"
          >
            <span>
              {win || 0} <span className="text-green-300">W</span> - {lose || 0}{' '}
              <span className="text-red-300">L</span>
            </span>
            {wl.length > 1 && <span className="text-xs ">{type}</span>}
          </div>
        ))}
      </Card>
    </div>
  )
}
