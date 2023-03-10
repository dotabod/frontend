import * as Flags from 'mantine-flagpack'
import { Settings } from '@/lib/defaultSettings'
import { useUpdateSetting } from '@/lib/hooks/useUpdateSetting'
import React from 'react'
import { PlayerTopbar } from '@/components/Overlay/PlayerTopbar'
import clsx from 'clsx'
import { useTransformRes } from '@/lib/hooks/useTransformRes'

export type NotablePlayer = {
  heroId: number
  account_id: number
  position: number
  heroName: string
  name: string
  image?: string
  country_code?: string
}

export const NotablePlayers = ({
  players,
  block,
}: {
  players: NotablePlayer[] | null
  block: any
}) => {
  const res = useTransformRes()
  const { data: isEnabled } = useUpdateSetting(Settings.notablePlayersOverlay)
  const { data: showFlags } = useUpdateSetting(
    Settings.notablePlayersOverlayFlags
  )

  if (!isEnabled || !['spectator', 'playing'].includes(block.type)) {
    return null
  }

  return (
    <div>
      {(players || []).map((player, i) => {
        const FlagComp = player.country_code
          ? Flags[`${player.country_code.toUpperCase()}Flag`]
          : null

        return (
          <PlayerTopbar key={i} position={player.position}>
            <div className="flex flex-col items-center">
              <div>
                {player.image ? (
                  <div
                    style={{ position: 'relative', display: 'inline-block' }}
                  >
                    <div
                      className="h-12 w-12 animate-spin-slow rounded-full
    border-y-2 border-solid border-red-500 border-t-transparent shadow-md"
                      style={{
                        position: 'absolute',
                        width: res({ w: 45 }),
                        height: res({ h: 45 }),
                      }}
                    ></div>
                    <img
                      src={player.image}
                      alt={player.name}
                      width={res({ w: 45 })}
                      height={res({ h: 45 })}
                      className="rounded-full"
                    />
                  </div>
                ) : (
                  <div className={clsx(!showFlags && 'hidden')}>
                    {FlagComp ? (
                      <FlagComp w={30} radius={2} />
                    ) : (
                      <div style={{ height: 22.5 }} />
                    )}
                  </div>
                )}
              </div>
              <div className={clsx('font-outline-2 pb-1')}>{player.name}</div>
            </div>
          </PlayerTopbar>
        )
      })}
    </div>
  )
}
