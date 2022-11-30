'use client'
import { fetcher } from '@/lib/fetcher'

export const getWL = (userId, cb) => {
  fetcher(`/api/wl?id=${userId}`)
    .then(
      (values: {
        ranked: { win: number; lose: number }
        unranked: { win: number; lose: number }
      }) => {
        const { ranked, unranked } = values
        const hasUnranked = unranked.win + unranked.win !== 0
        const hasRanked = ranked.win + ranked.lose !== 0

        const record = []
        if (hasRanked)
          record.push({ win: ranked.win, lose: ranked.lose, type: 'R' })
        if (hasUnranked)
          record.push({ win: unranked.win, lose: unranked.lose, type: 'U' })
        if (!hasRanked && !hasUnranked)
          record.push({ win: 0, lose: 0, type: 'U' })
        cb(record)
      }
    )
    .catch((e) => {
      console.log(e)
    })
}
