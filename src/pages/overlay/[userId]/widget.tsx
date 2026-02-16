import { clsx } from 'clsx'
import type { GetServerSideProps } from 'next'
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
import { getOverlayMaintenanceProps } from '@/lib/server/maintenance'

let socket: Socket | null = null
interface WidgetPageProps {
  maintenanceBlank: boolean
}

function WidgetPage({ maintenanceBlank }: WidgetPageProps) {
  if (maintenanceBlank) {
    return null
  }

  const { mutate } = useUpdateSetting(Settings.commandWL)
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
  const [rankImageDetails, setRankImageDetails] = useState<{
    image: string | null
    rank: number | null
    leaderboard: number | null | undefined
    notLoaded?: boolean
  }>({
    image: '0.png',
    rank: 0,
    leaderboard: 0,
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

    socket.on('refresh-settings', (key: typeof Settings) => {
      mutate()
    })

    socket.on('update-medal', (deets: RankType) => {
      if (isDev) return
      const rankDetails = getRankImage(deets)
      setRankImageDetails({
        image: rankDetails.image,
        rank: rankDetails.rank,
        leaderboard: rankDetails.leaderboard,
        notLoaded: false,
      })
    })
  }, [userId])

  useEffect(() => {
    return () => {
      socket?.off('update-wl')
      socket?.off('refresh-settings')
      socket?.off('update-medal')
    }
  }, [])

  useEffect(() => {
    if (!original) return

    const steamAccount = original.SteamAccount?.[0]
    const rank = getRankDetail(steamAccount?.mmr ?? original.mmr, steamAccount?.leaderboard_rank)

    if (!rank) return

    const rankDetails = {
      image: rank.myRank?.image ?? '0.png',
      rank: rank.mmr,
      leaderboard: 'standing' in rank ? rank.standing : (steamAccount?.leaderboard_rank ?? false),
      notLoaded: false,
    }

    setRankImageDetails(rankDetails)
  }, [original])

  return (
    <div>
      <div
        className={clsx('absolute flex items-end justify-end', isRight && 'justify-start!')}
        id='ingame-wl-mmr-card'
        style={{
          ...wlPosition,
          width: res({ w: 215 }),
          left: wlPosition.left ?? undefined,
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

export const getServerSideProps: GetServerSideProps<WidgetPageProps> = async () =>
  getOverlayMaintenanceProps({})
