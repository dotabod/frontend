import { clsx } from 'clsx'
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import type { Socket } from 'socket.io-client'
import io from 'socket.io-client'
import { AnimatedRankBadge } from '@/components/Overlay/rank/AnimatedRankBadge'
import { AnimatedWL } from '@/components/Overlay/wl/AnimatedWL'
import { RestrictFeature } from '@/components/RestrictFeature'
import { Settings } from '@/lib/defaultSettings'
import { isDev } from '@/lib/devConsts'
import { useOverlayPositions } from '@/lib/hooks/useOverlayPositions'
import type { wlType } from '@/lib/hooks/useSocket'
import { useTransformRes } from '@/lib/hooks/useTransformRes'
import { useUpdateSetting } from '@/lib/hooks/useUpdateSetting'
import { getRankDetail, getRankImage, type RankType } from '@/lib/ranks'

const isMaintenanceMode = process.env.NEXT_PUBLIC_IS_IN_MAINTENANCE_MODE === 'true'

let socket: Socket | null = null

function WidgetPage() {
  const { mutate } = useUpdateSetting(Settings.commandWL)
  const router = useRouter()
  const { userId } = router.query
  const { original } = useUpdateSetting()
  const res = useTransformRes()
  const { wlPosition } = useOverlayPositions()
  const { data: isRight } = useUpdateSetting(Settings.minimapRight)
  const [wl, setWL] = useState([
    {
      lose: 0,
      type: 'U',
      win: 0,
    },
  ])
  const [rankImageDetails, setRankImageDetails] = useState<{
    image: string | null
    rank: number | null
    leaderboard: number | null | undefined
    notLoaded?: boolean
  }>({
    image: '0.png',
    leaderboard: 0,
    notLoaded: true,
    rank: 0,
  })

  useEffect(() => {
    if (isMaintenanceMode) {
      return
    }
    if (!userId) {
      return
    }

    console.log('Connecting to socket init...')

    socket = io(process.env.NEXT_PUBLIC_GSI_WEBSOCKET_URL, {
      auth: { token: userId },
    })

    socket.on('update-wl', (records: wlType) => {
      if (isDev()) {
        return
      }
      setWL(records)
    })

    socket.on('refresh-settings', () => {
      mutate()
    })

    socket.on('update-medal', (deets: RankType) => {
      if (isDev()) {
        return
      }
      const rankDetails = getRankImage(deets)
      setRankImageDetails({
        image: rankDetails.image,
        leaderboard: rankDetails.leaderboard,
        notLoaded: false,
        rank: rankDetails.rank,
      })
    })
  }, [userId])

  useEffect(() => {
    if (isMaintenanceMode) {
      return
    }

    return () => {
      socket?.off('update-wl')
      socket?.off('refresh-settings')
      socket?.off('update-medal')
    }
  }, [])

  useEffect(() => {
    if (isMaintenanceMode) {
      return
    }
    if (!original) {
      return
    }

    const steamAccount = original.SteamAccount?.[0]
    const rank = getRankDetail(
      Number(steamAccount?.mmr ?? original.mmr ?? 0),
      steamAccount?.leaderboard_rank ?? null,
    )

    if (!rank) {
      return
    }

    const leaderboard =
      'standing' in rank ? rank.standing : (steamAccount?.leaderboard_rank ?? null)

    const rankDetails: {
      image: string
      rank: number
      leaderboard: number | null
      notLoaded: boolean
    } = {
      image: rank.myRank?.image ?? '0.png',
      leaderboard,
      notLoaded: false,
      rank: rank.mmr,
    }

    setRankImageDetails(rankDetails)
  }, [original])

  if (isMaintenanceMode) {
    return null
  }

  return (
    <div>
      <div
        className={clsx('absolute flex items-end justify-end', isRight && 'justify-start!')}
        id='ingame-wl-mmr-card'
        style={{
          ...wlPosition,
          left: wlPosition.left ?? undefined,
          width: res({ w: 215 }),
        }}
      >
        <RestrictFeature feature='commandWL'>
          <AnimatedWL
            key='animate-wl-class'
            wl={wl}
            className={clsx('block', isRight && 'order-2')}
          />
        </RestrictFeature>

        <RestrictFeature feature='showRankImage'>
          <AnimatedRankBadge
            className={clsx('block', isRight && 'order-1')}
            key='animate-rank-badge-class'
            rankImageDetails={{
              ...rankImageDetails,
              leaderboard: rankImageDetails.leaderboard ?? null,
            }}
          />
        </RestrictFeature>
      </div>
    </div>
  )
}

export default WidgetPage
