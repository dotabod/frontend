import { useState } from 'react'
import { NotablePlayer } from '@/components/Overlay/NotablePlayers'
import { isDev } from '@/lib/hooks/rosh'

const devPlayers = [
  {
    country_code: 'se',
    account_id: 39,
    position: 0,
    heroId: 5,
    heroName: 'Lich',
    name: 'Gorgc',
  },
  {
    country_code: 'ae',
    account_id: 39,
    position: 1,
    heroId: 5,
    heroName: 'Lich',
    name: '!Attacker',
  },
  {
    country_code: 'ua',
    account_id: 39,
    position: 4,
    heroId: 5,
    heroName: 'Lich',
    name: 'Yatoro',
  },
  {
    country_code: 'rs',
    account_id: 39,
    position: 8,
    heroId: 5,
    heroName: 'Lich',
    name: 'BoraNija ',
  },
  {
    country_code: 'us',
    account_id: 39,
    position: 9,
    heroId: 5,
    heroName: 'Lich',
    name: 'Gunnar ',
  },
]

export const useNotablePlayers = () => {
  const [notablePlayers, setNotablePlayers] = useState<NotablePlayer[]>(
    isDev ? devPlayers : []
  )

  return { notablePlayers, setNotablePlayers }
}