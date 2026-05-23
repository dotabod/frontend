import { useEffect, useState } from 'react'
import type { NotablePlayer } from '@/components/Overlay/NotablePlayers'
import { isDev } from '@/lib/devConsts'

const devPlayers: NotablePlayer[] = [
  {
    account_id: 103_910_993,
    country_code: 'se',
    heroId: 5,
    heroName: 'Lich',
    image:
      'https://static-cdn.jtvnw.net/jtv_user_pictures/gorgc-profile_image-469e05d25a1e8594-70x70.jpeg',
    isMe: false,
    name: 'Gorgc',
    position: 0,
  },
  {
    account_id: 48_594_480,
    country_code: 'ae',
    heroId: 5,
    heroName: 'Lich',
    isMe: true,
    name: 'lil pleb',
    position: 1,
  },
  {
    account_id: 39,
    country_code: 'ua',
    heroId: 5,
    heroName: 'Lich',
    isMe: false,
    name: 'Yatoro',
    position: 4,
  },
  {
    account_id: 39,
    country_code: 'rs',
    heroId: 5,
    heroName: 'Lich',
    isMe: false,
    name: 'BoraNija ',
    position: 8,
  },
  {
    account_id: 39,
    country_code: 'us',
    heroId: 5,
    heroName: 'Lich',
    isMe: false,
    name: 'Gunnar ',
    position: 9,
  },
]

export const useNotablePlayers = () => {
  const [notablePlayers, setNotablePlayers] = useState<NotablePlayer[]>([])

  useEffect(() => {
    if (!isDev()) {
      return
    }

    setNotablePlayers(devPlayers)
  }, [])

  return { notablePlayers, setNotablePlayers }
}
