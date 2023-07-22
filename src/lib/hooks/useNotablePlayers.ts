import { useState } from 'react'
import { NotablePlayer } from '@/components/Overlay/NotablePlayers'
import { isDev } from '@/lib/devConsts'

const devPlayers: NotablePlayer[] = [
  {
    country_code: 'se',
    account_id: 103910993,
    position: 0,
    heroId: 5,
    heroName: 'Lich',
    isMe: false,
    image:
      'https://static-cdn.jtvnw.net/jtv_user_pictures/gorgc-profile_image-469e05d25a1e8594-70x70.jpeg',
    name: 'Gorgc',
  },
  {
    country_code: 'ae',
    account_id: 48594480,
    position: 1,
    heroId: 5,
    heroName: 'Lich',
    isMe: true,
    name: 'lil pleb',
  },
  {
    country_code: 'ua',
    account_id: 39,
    position: 4,
    heroId: 5,
    heroName: 'Lich',
    isMe: false,
    name: 'Yatoro',
  },
  {
    country_code: 'rs',
    account_id: 39,
    position: 8,
    heroId: 5,
    heroName: 'Lich',
    isMe: false,
    name: 'BoraNija ',
  },
  {
    country_code: 'us',
    account_id: 39,
    position: 9,
    heroId: 5,
    heroName: 'Lich',
    isMe: false,
    name: 'Gunnar ',
  },
]

export const useNotablePlayers = () => {
  const [notablePlayers, setNotablePlayers] = useState<NotablePlayer[]>(
    isDev ? devPlayers : []
  )

  return { notablePlayers, setNotablePlayers }
}
