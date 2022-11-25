'use client'
import { fetcher } from '@/lib/fetcher'

export const getWL = (steam32Id, cb) => {
  const promises = [
    fetcher(
      `https://api.opendota.com/api/players/${steam32Id}/wl/?date=0.5&lobby_type=0`
    ),
    fetcher(
      `https://api.opendota.com/api/players/${steam32Id}/wl/?date=0.5&lobby_type=7`
    ),
  ]

  Promise.all(promises)
    .then((values: { win: number; lose: number }[]) => {
      const [unranked, ranked] = values
      const { win, lose } = ranked
      const { win: unrankedWin, lose: unrankedLose } = unranked
      const hasUnranked = unrankedWin + unrankedLose !== 0
      const hasRanked = win + lose !== 0

      const record = []
      if (hasRanked) record.push({ win: win, lose: lose, type: 'R' })
      if (hasUnranked)
        record.push({ win: unrankedWin, lose: unrankedLose, type: 'U' })
      if (!hasRanked && !hasUnranked)
        record.push({ win: 0, lose: 0, type: 'U' })
      cb(record)
    })
    .catch((e) => {
      console.log(e)
    })
}
