import { useState } from 'react'
import { NotablePlayer } from '@/components/Overlay/NotablePlayers'

export const isDev = process.env.NODE_ENV === 'development'
const devPlayers = [
  {
    countryCode: 'se',
    position: 0,
    name: 'Gorgc',
  },
  { countryCode: 'ae', position: 1, name: '!Attacker' },
  { countryCode: 'ru', position: 4, name: 'arteezys smurf ' },
  { countryCode: 'rs', position: 8, name: 'BoraNija ' },
  { countryCode: 'ru', position: 9, name: 'airu ' },
]

export const useNotablePlayers = () => {
  const [notablePlayers, setNotablePlayers] = useState<NotablePlayer[]>(
    isDev ? devPlayers : []
  )

  return { notablePlayers, setNotablePlayers }
}
