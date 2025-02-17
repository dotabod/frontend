import { AnimatedRankBadge } from '@/components/Overlay/rank/AnimatedRankBadge';
import { AnimatedWL } from '@/components/Overlay/wl/AnimatedWL';
import { clsx } from 'clsx';
import { Settings } from '@/lib/defaultSettings';
import { useOverlayPositions } from '@/lib/hooks/useOverlayPositions';
import { useTransformRes } from '@/lib/hooks/useTransformRes';
import { useUpdateSetting } from '@/lib/hooks/useUpdateSetting';
import { useState, useEffect } from 'react';
import { getRankDetail } from '@/lib/ranks';
import { isDev } from '@/lib/devConsts';
import { wlType } from '@/lib/hooks/useSocket';
import io from 'socket.io-client';
import { useRouter } from 'next/router';
import { Socket } from 'socket.io-client';

let socket: Socket | null = null
function WidgetPage() {
  const router = useRouter()
  const { userId } = router.query
  const { original } = useUpdateSetting()
  const res = useTransformRes()
  const { wlPosition } = useOverlayPositions()
  const { data: isRight } = useUpdateSetting(Settings.minimapRight)
  const [wl, setWL] = useState([
    {
      win: 0,
      lose: 0,
      type: 'U',
    },
  ])
  const [rankImageDetails, setRankImageDetails] = useState({
    image: '0.png',
    rank: 0,
    leaderboard: false,
    notLoaded: true,
  })


  useEffect(() => {
    if (!userId) return

    console.log('Connecting to socket init...')

    socket = io(process.env.NEXT_PUBLIC_GSI_WEBSOCKET_URL, {
      auth: { token: userId },
    })


    socket.on('update-wl', (records: wlType) => {
      if (isDev) return
      setWL(records)
    })
  }, [userId])

  useEffect(() => {
    return () => {
      socket?.off('update-wl')
    }
  }, [])

  useEffect(() => {
    if (!original) return

    const steamAccount = original.SteamAccount?.[0]
    const rank = getRankDetail(
      steamAccount?.mmr ?? original.mmr,
      steamAccount?.leaderboard_rank
    )

    if (!rank) return

    const rankDetails = {
      image: rank.myRank?.image ?? '0.png',
      rank: rank.mmr,
      leaderboard:
        'standing' in rank
          ? rank.standing
          : steamAccount?.leaderboard_rank ?? false,
      notLoaded: false,
    }

    setRankImageDetails(rankDetails)
  }, [original])

  return (
    <div>
      <div
        className={clsx(
          'absolute flex items-end justify-end',
          isRight && '!justify-start'
        )}
        id="ingame-wl-mmr-card"
        style={{ ...wlPosition, width: res({ w: 215 }) }}
      >
        <AnimatedWL
          key="animate-wl-class"
          wl={wl}
          className={clsx('block', isRight && 'order-2')}
        />

        <AnimatedRankBadge
          className={clsx('block', isRight && 'order-1')}
          key="animate-rank-badge-class"
          rankImageDetails={rankImageDetails}
        />
      </div>
    </div>
  )
}

export default WidgetPage
